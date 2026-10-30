-- ==============================================================================
-- MIGRATION: 20261025000000_init_multi_tenant_detailing.sql
-- DESCRIPTION: Multi-tenant database schema, btree_gist slot exclusion,
--              Row-Level Security (RLS) policies, and atomic booking RPC.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. TENANTS TABLE
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
    buffer_minutes INTEGER NOT NULL DEFAULT 15 CHECK (buffer_minutes >= 0 AND buffer_minutes <= 120),
    phone TEXT,
    address TEXT,
    config JSONB NOT NULL DEFAULT '{
        "openingHour": "08:00",
        "closingHour": "22:00",
        "workDays": [1, 2, 3, 4, 5, 6, 7],
        "heroTitle": "Премиальный детейлинг & бережная мойка",
        "heroSubtitle": "Швейцарская химия, бережная сушка турбиной и защита кузова керамикой",
        "infoCards": [
            { "title": "2-3 фазы мойки", "desc": "Бесконтактный состав + деликатный шампунь с пористой губкой" },
            { "title": "Сушка турбо-сушкой", "desc": "Исключаем микроцарапины и контакт с кузовом жесткими тряпками" },
            { "title": "Гарантия на детейлинг", "desc": "Сертифицированные мастера и закрытые обеспыленные боксы" }
        ]
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for instant slug lookup in routing (/s/:slug)
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (slug);

-- 3. BOXES TABLE (Моечные и детейлинг-боксы студии)
CREATE TABLE IF NOT EXISTS public.boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boxes_tenant ON public.boxes (tenant_id) WHERE is_active = true;

-- 4. SERVICES TABLE (Каталог услуг)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services (tenant_id, sort_order) WHERE is_active = true;

-- 5. BOOKINGS TABLE (Бронирования с защитой от овербукинга на уровне БД)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    box_id UUID NOT NULL REFERENCES public.boxes(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    car_model TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    buffered_end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    cancellation_token UUID NOT NULL DEFAULT gen_random_uuid(),
    client_generated_id TEXT, -- Идемпотентность от повторного клика клиента
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'paid', 'refunded')) DEFAULT 'unpaid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Проверка корректности временного интервала
    CONSTRAINT check_booking_times CHECK (start_time < end_time AND end_time <= buffered_end_time),
    
    -- Защита от дублирования при повторном клике клиента (idempotency)
    CONSTRAINT unique_tenant_client_idempotency UNIQUE (tenant_id, client_generated_id)
);

-- Физическое исключение пересекающихся интервалов по каждому боксу (кроме отмененных).
-- Использует tstzrange с включением начала и исключением конца: [start, buffered_end)
ALTER TABLE public.bookings ADD CONSTRAINT exclude_box_time_overlap
EXCLUDE USING gist (
    box_id WITH =,
    tstzrange(start_time, buffered_end_time, '[)') WITH &&
)
WHERE (status != 'cancelled');

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_time ON public.bookings (tenant_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_token ON public.bookings (cancellation_token);

-- 6. PAYMENTS TABLE (Касса: приход / возврат)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('payment', 'refund')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'sbp')) DEFAULT 'card',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant_date ON public.payments (tenant_id, created_at);

-- 7. TENANT_MEMBERS TABLE (Авторизованные владельцы и менеджеры)
CREATE TABLE IF NOT EXISTS public.tenant_members (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users(id)
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager')) DEFAULT 'manager',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id)
);

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 8.1 Tenants policies
CREATE POLICY "Public can view tenant profile by slug"
    ON public.tenants FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Owners can update their tenant"
    ON public.tenants FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.tenants.id
              AND tm.user_id = auth.uid()
              AND tm.role = 'owner'
        )
    );

-- 8.2 Boxes policies
CREATE POLICY "Public can view active boxes"
    ON public.boxes FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Tenant staff can manage boxes"
    ON public.boxes FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.boxes.tenant_id
              AND tm.user_id = auth.uid()
        )
    );

-- 8.3 Services policies
CREATE POLICY "Public can view active services"
    ON public.services FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Tenant staff can manage services"
    ON public.services FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.services.tenant_id
              AND tm.user_id = auth.uid()
        )
    );

-- 8.4 Bookings policies (КРИТИЧНО ДЛЯ БЕЗОПАСНОСТИ ДАННЫХ КЛИЕНТОВ)
-- Клиент (anon) видит бронь ИСКЛЮЧИТЕЛЬНО по личному секретному cancellation_token!
CREATE POLICY "Client can view booking via cancellation_token"
    ON public.bookings FOR SELECT
    TO anon, authenticated
    USING (
        cancellation_token = NULLIF(current_setting('app.current_cancellation_token', true), '')::uuid
    );

-- Владельцы и менеджеры видят только брони своего арендатора
CREATE POLICY "Tenant staff has full access to their bookings"
    ON public.bookings FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.bookings.tenant_id
              AND tm.user_id = auth.uid()
        )
    );

-- 8.5 Payments policies (Доступно строго персоналу арендатора)
CREATE POLICY "Tenant staff can view and manage payments"
    ON public.payments FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.payments.tenant_id
              AND tm.user_id = auth.uid()
        )
    );

-- 8.6 Tenant members policies
CREATE POLICY "Tenant staff can view members"
    ON public.tenant_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.tenant_members.tenant_id
              AND tm.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- 9. SECURE RPC FUNCTIONS
-- ==============================================================================

-- 9.1 Публичная функция получения занятых слотов БЕЗ раскрытия личных данных клиентов (anon safe)
CREATE OR REPLACE FUNCTION public.get_busy_slots(
    p_tenant_id UUID,
    p_start TIMESTAMPTZ,
    p_end TIMESTAMPTZ
)
RETURNS TABLE (
    box_id UUID,
    start_time TIMESTAMPTZ,
    buffered_end_time TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        b.box_id,
        b.start_time,
        b.buffered_end_time
    FROM public.bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.status != 'cancelled'
      AND b.start_time < p_end
      AND b.buffered_end_time > p_start;
$$;

GRANT EXECUTE ON FUNCTION public.get_busy_slots(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- 9.2 Атомарное бронирование с защитой от гонок и повторного клика (Idempotent + Atomic)
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
    p_tenant_id UUID,
    p_service_id UUID,
    p_client_name TEXT,
    p_client_phone TEXT,
    p_car_model TEXT,
    p_start_time TIMESTAMPTZ,
    p_client_generated_id TEXT,
    p_preferred_box_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_booking RECORD;
    v_service RECORD;
    v_tenant RECORD;
    v_duration INTEGER;
    v_buffer INTEGER;
    v_end_time TIMESTAMPTZ;
    v_buffered_end_time TIMESTAMPTZ;
    v_chosen_box_id UUID;
    v_new_booking RECORD;
BEGIN
    -- Шаг 1. Проверка идемпотентности (если клиент случайно кликнул дважды с тем же client_generated_id)
    IF p_client_generated_id IS NOT NULL AND length(trim(p_client_generated_id)) > 0 THEN
        SELECT 
            b.id,
            b.cancellation_token,
            b.start_time,
            b.end_time,
            b.status,
            b.total_price,
            bx.name as box_name
        INTO v_existing_booking
        FROM public.bookings b
        JOIN public.boxes bx ON bx.id = b.box_id
        WHERE b.tenant_id = p_tenant_id
          AND b.client_generated_id = p_client_generated_id;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_idempotent_duplicate', true,
                'booking_id', v_existing_booking.id,
                'cancellation_token', v_existing_booking.cancellation_token,
                'start_time', v_existing_booking.start_time,
                'end_time', v_existing_booking.end_time,
                'box_name', v_existing_booking.box_name,
                'status', v_existing_booking.status,
                'total_price', v_existing_booking.total_price
            );
        END IF;
    END IF;

    -- Шаг 2. Накладываем транзакционную рекомендательную блокировку по tenant_id
    -- Это гарантирует строгую сериализацию одновременных запросов в рамках одной студии
    PERFORM pg_advisory_xact_lock(hashtext('tenant_lock_' || p_tenant_id::text));

    -- Шаг 3. Получаем параметры арендатора (буферное время)
    SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'TENANT_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    v_buffer := COALESCE(v_tenant.buffer_minutes, 15);

    -- Шаг 4. Получаем данные услуги (длительность и цена)
    SELECT * INTO v_service 
    FROM public.services 
    WHERE id = p_service_id AND tenant_id = p_tenant_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SERVICE_NOT_FOUND_OR_INACTIVE' USING ERRCODE = 'P0002';
    END IF;

    v_duration := v_service.duration_minutes;
    v_end_time := p_start_time + (v_duration || ' minutes')::interval;
    v_buffered_end_time := v_end_time + (v_buffer || ' minutes')::interval;

    -- Шаг 5. Поиск свободного бокса с проверкой буфера и диапазона tstzrange
    IF p_preferred_box_id IS NOT NULL THEN
        -- Проверяем предпочтительный бокс
        SELECT bx.id INTO v_chosen_box_id
        FROM public.boxes bx
        WHERE bx.id = p_preferred_box_id
          AND bx.tenant_id = p_tenant_id
          AND bx.is_active = true
          AND NOT EXISTS (
              SELECT 1 
              FROM public.bookings b
              WHERE b.box_id = bx.id
                AND b.status != 'cancelled'
                AND tstzrange(b.start_time, b.buffered_end_time, '[)') && tstzrange(p_start_time, v_buffered_end_time, '[)')
          );
    ELSE
        -- Автоматический выбор первого свободного активного бокса
        SELECT bx.id INTO v_chosen_box_id
        FROM public.boxes bx
        WHERE bx.tenant_id = p_tenant_id
          AND bx.is_active = true
          AND NOT EXISTS (
              SELECT 1 
              FROM public.bookings b
              WHERE b.box_id = bx.id
                AND b.status != 'cancelled'
                AND tstzrange(b.start_time, b.buffered_end_time, '[)') && tstzrange(p_start_time, v_buffered_end_time, '[)')
          )
        ORDER BY bx.created_at ASC
        LIMIT 1;
    END IF;

    -- Если нет доступных боксов — выбрасываем контролируемое исключение
    IF v_chosen_box_id IS NULL THEN
        RAISE EXCEPTION 'SLOT_ALREADY_TAKEN' USING ERRCODE = 'P0001';
    END IF;

    -- Шаг 6. Создаем бронь в транзакции
    INSERT INTO public.bookings (
        tenant_id,
        box_id,
        service_id,
        client_name,
        client_phone,
        car_model,
        start_time,
        end_time,
        buffered_end_time,
        status,
        client_generated_id,
        total_price,
        payment_status
    ) VALUES (
        p_tenant_id,
        v_chosen_box_id,
        p_service_id,
        trim(p_client_name),
        trim(p_client_phone),
        trim(p_car_model),
        p_start_time,
        v_end_time,
        v_buffered_end_time,
        'pending',
        p_client_generated_id,
        v_service.price,
        'unpaid'
    )
    RETURNING 
        id, 
        cancellation_token, 
        start_time, 
        end_time, 
        status, 
        total_price, 
        created_at 
    INTO v_new_booking;

    -- Шаг 7. Возвращаем структурированный ответ клиенту
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_new_booking.id,
        'cancellation_token', v_new_booking.cancellation_token,
        'start_time', v_new_booking.start_time,
        'end_time', v_new_booking.end_time,
        'status', v_new_booking.status,
        'total_price', v_new_booking.total_price,
        'box_id', v_chosen_box_id
    );
EXCEPTION
    -- Перехватываем исключение gist exclusion (на случай непредвиденных гонок)
    WHEN exclusion_violation THEN
        RAISE EXCEPTION 'SLOT_ALREADY_TAKEN' USING ERRCODE = 'P0001';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_atomic(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID) TO anon, authenticated;

-- 9.3 Безопасное получение брони клиентом по cancellation_token
CREATE OR REPLACE FUNCTION public.get_booking_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_res JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', b.id,
        'client_name', b.client_name,
        'client_phone', b.client_phone,
        'car_model', b.car_model,
        'start_time', b.start_time,
        'end_time', b.end_time,
        'status', b.status,
        'total_price', b.total_price,
        'payment_status', b.payment_status,
        'service_title', s.title,
        'box_name', bx.name,
        'tenant_name', t.name,
        'tenant_slug', t.slug,
        'tenant_address', t.address,
        'tenant_phone', t.phone,
        'timezone', t.timezone
    ) INTO v_res
    FROM public.bookings b
    JOIN public.services s ON s.id = b.service_id
    JOIN public.boxes bx ON bx.id = b.box_id
    JOIN public.tenants t ON t.id = b.tenant_id
    WHERE b.cancellation_token = p_token;

    RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_by_token(UUID) TO anon, authenticated;

-- 9.4 Безопасная клиентская отмена записи по cancellation_token
CREATE OR REPLACE FUNCTION public.cancel_booking_by_token(p_token UUID, p_reason TEXT DEFAULT 'Client cancelled')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking RECORD;
BEGIN
    SELECT id, status, start_time 
    INTO v_booking 
    FROM public.bookings 
    WHERE cancellation_token = p_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    IF v_booking.status = 'cancelled' THEN
        RETURN true;
    END IF;

    -- Клиент не может отменить бронь, которая уже завершена или в работе
    IF v_booking.status IN ('in_progress', 'completed') THEN
        RAISE EXCEPTION 'CANNOT_CANCEL_IN_PROGRESS_OR_COMPLETED' USING ERRCODE = 'P0003';
    END IF;

    UPDATE public.bookings 
    SET status = 'cancelled' 
    WHERE id = v_booking.id;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking_by_token(UUID, TEXT) TO anon, authenticated;
