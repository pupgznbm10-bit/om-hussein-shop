import json
import os
import mimetypes
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import request

PORT = int(os.environ.get('PORT', 8000))
BOT_TOKEN = os.environ.get('BOT_TOKEN', '8823136507:AAEqb30mMHpuOr5hwWEOFcXp8JHNjC3GaaU')
CHAT_ID = os.environ.get('CHAT_ID', '1267575587')
STORE_EMAIL = os.environ.get('STORE_EMAIL', 'mw01551687704@gmail.com')
SMTP_HOST = os.environ.get('SMTP_HOST')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER')
SMTP_PASS = os.environ.get('SMTP_PASS')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EMAIL_LOG_DIR = Path(BASE_DIR) / 'email-logs'
EMAIL_LOG_DIR.mkdir(exist_ok=True)


def log_email(subject: str, to_recipients, body: str, sender: str):
    timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    payload = {
        'timestamp': timestamp,
        'subject': subject,
        'from': sender,
        'to': list(to_recipients),
        'body': body,
    }
    file_path = EMAIL_LOG_DIR / f'email-{timestamp.replace(":", "-")}.json'
    file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    return payload


def send_email(subject: str, recipients, body: str, sender: str = STORE_EMAIL):
    recipients = [recipient for recipient in recipients if recipient]
    if not recipients:
        return {'ok': True, 'mode': 'skipped', 'recipients': []}

    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        log_email(subject, recipients, body, sender)
        return {'ok': True, 'mode': 'stored', 'recipients': recipients}

    message = EmailMessage()
    message['From'] = sender
    message['To'] = ', '.join(recipients)
    message['Subject'] = subject
    message.set_content(body)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
            smtp.starttls(context=context)
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(message)
        return {'ok': True, 'mode': 'smtp', 'recipients': recipients}
    except Exception:
        log_email(subject, recipients, body, sender)
        return {'ok': True, 'mode': 'fallback-stored', 'recipients': recipients}


def send_to_telegram(message: str):
    if not BOT_TOKEN or not CHAT_ID:
        return {'ok': False, 'error': 'Telegram credentials missing'}

    payload = json.dumps({
        'chat_id': CHAT_ID,
        'text': message,
        'parse_mode': 'HTML'
    }).encode('utf-8')

    telegram_url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    req = request.Request(
        telegram_url,
        data=payload,
        headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
        method='POST'
    )
    with request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode('utf-8'))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_POST(self):
        endpoint = self.path.split('?', 1)[0]
        if endpoint in ('/api/order', '/api/send-order'):
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length) if length else b''

            try:
                data = json.loads(raw.decode('utf-8')) if raw else {}
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Invalid JSON'}).encode('utf-8'))
                return

            message = str(data.get('message') or '').strip()
            if not message:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Missing message'}).encode('utf-8'))
                return

            customer_name = str(data.get('customerName') or 'عزيزي العميل').strip() or 'عزيزي العميل'
            customer_email = str(data.get('customerEmail') or '').strip()
            order_total = str(data.get('orderTotal') or '0').strip()
            order_details = str(data.get('orderDetails') or message).strip() or message

            store_subject = f'طلب جديد من متجر أم شهد - {customer_name}'
            store_body = (
                f'اسم العميل: {customer_name}\n'
                f'البريد الإلكتروني: {customer_email or "غير موجود"}\n'
                f'الإجمالي: {order_total} جنيه\n\n'
                f'تفاصيل الطلب:\n{order_details}\n'
            )

            customer_subject = 'تم استلام طلبك بنجاح - متجر أم شهد'
            customer_body = (
                f'عزيزي/ة {customer_name},\n\n'
                'شكرًا لك على زيارتك لمتجر أم شهد، وتم استلام طلبك بنجاح.\n'
                'سوف يتم التواصل معك لتأكيد الطلب وتحديد وقت التوصيل.\n\n'
                f'إجمالي الطلب: {order_total} جنيه\n\n'
                'نسعد بخدمتك، ونقدر ثقتك بنا.\n'
                'متجر أم شهد'
            )

            try:
                telegram_result = send_to_telegram(message)
            except Exception as exc:
                telegram_result = {'ok': False, 'error': str(exc)}

            store_email_result = send_email(store_subject, [STORE_EMAIL], store_body)
            customer_email_result = send_email(customer_subject, [customer_email] if customer_email else [], customer_body) if customer_email else {'ok': True, 'mode': 'skipped', 'recipients': []}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                'ok': True,
                'telegram': telegram_result,
                'storeEmail': store_email_result,
                'customerEmail': customer_email_result,
            }).encode('utf-8'))
            return

        self.send_error(404)

    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        elif self.path.startswith('/api/'):
            self.send_error(404)
            return
        return super().do_GET()


if __name__ == '__main__':
    mimetypes.add_type('application/javascript', '.js')
    server = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print(f'Serving on http://0.0.0.0:{PORT}')
    server.serve_forever()
