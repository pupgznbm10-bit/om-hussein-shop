import json
import os
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib import request

PORT = int(os.environ.get('PORT', 3000))
BOT_TOKEN = os.environ.get('BOT_TOKEN', '8823136507:AAEqb30mMHpuOr5hwWEOFcXp8JHNjC3GaaU')
CHAT_ID = os.environ.get('CHAT_ID', '1267575587')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def send_to_telegram(message: str):
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

            try:
                result = send_to_telegram(message)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': True, 'result': result}).encode('utf-8'))
            except Exception as exc:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': str(exc)}).encode('utf-8'))
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
