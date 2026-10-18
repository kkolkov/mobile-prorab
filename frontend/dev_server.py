"""Local static server. Revalidate assets on every navigation to avoid mixed ES-module versions."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path
import argparse

class DevHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5500)
    args = parser.parse_args()
    handler = partial(DevHandler, directory=str(Path(__file__).resolve().parent))
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        print(f'Frontend: http://127.0.0.1:{args.port}', flush=True)
        server.serve_forever()
