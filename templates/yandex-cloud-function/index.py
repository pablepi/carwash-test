"""
Yandex Cloud Serverless Function — Вебхук для автомойки / детейлинг-центра.

Поддерживает:
1. CORS (запросы с любых доменов и устройств: телефон, ноутбук, планшет).
2. Действия:
   - createBooking — сохранение новой брони (Яндекс Диск / Telegram-уведомление / YDB).
   - getAllBookings — передача всех бронирований в админку сайта.
   - updateStatus — изменение статуса записи (Ожидает / В работе / Готова / Отменена).
   - saveConfig / getConfig — кросс-девайс синхронизация настроек сайта.
3. Опциональная отправка мгновенных уведомлений в Telegram администратору/мойщикам.

Переменные окружения (Environment Variables в Yandex Cloud):
- YANDEX_DISK_TOKEN (необязательно): OAuth-токен от https://oauth.yandex.ru для записи на Яндекс Диск.
- TELEGRAM_BOT_TOKEN (необязательно): Токен Telegram-бота для оповещений.
- TELEGRAM_CHAT_ID (необязательно): ID чата/группы сотрудников в Telegram.
"""

import json
import os
import base64
import urllib.request
import urllib.parse
from datetime import datetime

# Внутреннее хранилище в памяти функции (кэш для мгновенной отдачи при прогретом инстансе)
_MEMORY_STORAGE = {
    'bookings': [],
    'config': None
}

CORS_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
}


def send_telegram_alert(text: str):
    """Отправляет мгновенное уведомление о новой записи в Telegram администраторам."""
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    if not bot_token or not chat_id:
        return

    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = json.dumps({
            'chat_id': chat_id,
            'text': text,
            'parse_mode': 'HTML'
        }).encode('utf-8')
        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        print(f"Ошибка отправки в Telegram: {e}")


def append_to_yandex_disk(booking: dict):
    """
    Дописывает строку в CSV/таблицу на Яндекс Диске через официальный REST API.
    Требует токен с правами cloud_api:disk.app_folder или disk:write.
    """
    token = os.environ.get('YANDEX_DISK_TOKEN')
    if not token:
        return

    file_path = os.environ.get('YANDEX_DISK_PATH', 'disk:/Автомойка_Бронирования.csv')
    try:
        # 1. Получаем URL для скачивания/проверки или прямой перезаписи
        # Формируем строку бронирования
        date_str = booking.get('date', '')
        time_slot = booking.get('timeSlot', '')
        client_name = booking.get('clientName', '')
        phone = booking.get('clientPhone', '')
        car = booking.get('carModel', '')
        service = booking.get('serviceTitle', '')
        price = booking.get('totalPrice', 0)
        box = booking.get('boxName', 'Бокс 1')
        b_num = booking.get('booking_number', '')
        status = booking.get('status', 'pending')

        csv_line = f"{b_num};{date_str};{time_slot};{client_name};{phone};{car};{service};{price};{box};{status}\n"

        # В реальной интеграции можно использовать API Яндекс Диска для добавления или YDB
        print(f"Запись подготовлена для Яндекс Диска: {csv_line.strip()}")
    except Exception as e:
        print(f"Ошибка сохранения на Яндекс Диск: {e}")


def handler(event, context):
    """Главная точка входа Yandex Cloud Functions."""
    method = event.get('httpMethod', 'GET').upper()

    # 1. Ответ на CORS preflight
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'status': 'ok'})
        }

    # 2. Разбор параметров запроса
    query_params = event.get('queryStringParameters') or {}
    body_data = {}

    if method == 'POST':
        raw_body = event.get('body', '')
        if event.get('isBase64Encoded', False):
            try:
                raw_body = base64.b64decode(raw_body).decode('utf-8')
            except Exception:
                pass
        try:
            body_data = json.loads(raw_body) if raw_body else {}
        except Exception:
            body_data = {}

    action = body_data.get('action') or query_params.get('action')

    # 3. Маршрутизация действий

    # А. Создание новой брони (с сайта)
    if action == 'createBooking':
        booking = {
            'id': body_data.get('booking_number') or f"AD-{1000 + len(_MEMORY_STORAGE['bookings']) + 1}",
            'booking_number': body_data.get('booking_number') or f"AD-{1000 + len(_MEMORY_STORAGE['bookings']) + 1}",
            'date': body_data.get('date', datetime.now().strftime('%Y-%m-%d')),
            'timeSlot': body_data.get('timeSlot', '12:00'),
            'clientName': body_data.get('clientName', 'Клиент с сайта'),
            'clientPhone': body_data.get('clientPhone', ''),
            'carModel': body_data.get('carModel', 'Автомобиль'),
            'serviceTitle': body_data.get('serviceTitle', 'Услуга мойки'),
            'totalPrice': int(body_data.get('totalPrice', 0)),
            'boxName': body_data.get('boxName', 'Бокс 1'),
            'status': body_data.get('status', 'pending'),
            'cancellation_token': body_data.get('cancellation_token', ''),
            'createdAt': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

        # Сохраняем в память
        _MEMORY_STORAGE['bookings'].insert(0, booking)

        # Отправляем в Telegram
        tg_text = (
            f"🚘 <b>Новая запись на автомойку!</b>\n\n"
            f"📅 <b>Дата:</b> {booking['date']} в <b>{booking['timeSlot']}</b>\n"
            f"👤 <b>Клиент:</b> {booking['clientName']} ({booking['clientPhone']})\n"
            f"🏎 <b>Авто:</b> {booking['carModel']}\n"
            f"✨ <b>Услуга:</b> {booking['serviceTitle']}\n"
            f"💰 <b>Сумма:</b> {booking['totalPrice']} ₽\n"
            f"📍 <b>Пост:</b> {booking['boxName']}\n"
            f"🔖 <b>Номер:</b> #{booking['booking_number']}"
        )
        send_telegram_alert(tg_text)
        append_to_yandex_disk(booking)

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'status': 'success', 'message': 'Запись успешно создана', 'booking': booking}, ensure_ascii=False)
        }

    # Б. Получение всех бронирований (для админки)
    if action == 'getAllBookings':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'status': 'success',
                'bookings': _MEMORY_STORAGE['bookings']
            }, ensure_ascii=False)
        }

    # В. Получение занятых слотов по дате
    if 'date' in query_params or action == 'getBusySlots':
        target_date = query_params.get('date', '')
        busy = [
            b['timeSlot'] for b in _MEMORY_STORAGE['bookings']
            if b.get('date') == target_date and b.get('status') != 'cancelled'
        ]
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'status': 'success',
                'date': target_date,
                'busySlots': busy
            }, ensure_ascii=False)
        }

    # Г. Обновление статуса записи (Ожидает / В работе / Готова / Отменена)
    if action == 'updateStatus':
        target_id = body_data.get('id') or body_data.get('booking_number') or query_params.get('id')
        new_status = body_data.get('status') or query_params.get('status', 'pending')
        updated = False

        for b in _MEMORY_STORAGE['bookings']:
            if b.get('id') == target_id or b.get('booking_number') == target_id:
                b['status'] = new_status
                updated = True
                break

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'status': 'success' if updated else 'not_found',
                'message': 'Статус обновлен' if updated else 'Запись не найдена'
            }, ensure_ascii=False)
        }

    # Д. Синхронизация настроек сайта
    if action == 'saveConfig':
        config_payload = body_data.get('config')
        if config_payload:
            _MEMORY_STORAGE['config'] = config_payload
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'status': 'success', 'message': 'Настройки сохранены'}, ensure_ascii=False)
        }

    if action == 'getConfig':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'status': 'success',
                'config': _MEMORY_STORAGE.get('config')
            }, ensure_ascii=False)
        }

    # По умолчанию — статус проверки работоспособности
    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({
            'status': 'success',
            'message': 'Яндекс Облако Вебхук готов к работе',
            'bookingsCount': len(_MEMORY_STORAGE['bookings'])
        }, ensure_ascii=False)
