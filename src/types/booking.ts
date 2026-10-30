import { z } from 'zod';

export const ClientBookingFormSchema = z.object({
  clientName: z.string().min(2, 'Укажите ваше имя').max(60),
  clientPhone: z.string().regex(/^\+7\s?\(\d{3}\)\s?\d{3}-\d{2}-\d{2}$/, 'Укажите телефон в формате +7 (999) 000-00-00'),
  carModel: z.string().min(2, 'Укажите марку и модель авто (например, BMW M5 или Haval H9)').max(70),
  carPlate: z.string().optional(),
  serviceId: z.string().uuid('Выберите услугу'),
  startTime: z.string().datetime('Некорректная дата и время'),
  clientGeneratedId: z.string().min(10),
});

export type ClientBookingFormData = z.infer<typeof ClientBookingFormSchema>;

export type BookingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface BookingEntity {
  id: string;
  tenant_id: string;
  box_id: string;
  service_id: string;
  client_name: string;
  client_phone: string;
  car_model: string;
  start_time: string;
  end_time: string;
  buffered_end_time: string;
  status: BookingStatus;
  cancellation_token: string;
  total_price: number;
  payment_status: PaymentStatus;
  created_at: string;
  box_name?: string;
  service_title?: string;
}

export interface SlotAvailability {
  timeStr: string; // "10:00"
  dateTimeIso: string;
  isAvailable: boolean;
  boxId?: string;
  boxName?: string;
  reason?: 'booked' | 'outside_hours' | 'insufficient_buffer' | 'past';
}

export interface DayAvailability {
  dateIso: string; // "YYYY-MM-DD"
  isWorkDay: boolean;
  slots: SlotAvailability[];
}
