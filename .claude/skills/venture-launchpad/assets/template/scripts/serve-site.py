# Local preview server for the built site (_site/), with clean URLs like GitHub Pages (/map -> map.html).
# Usage: python3 scripts/serve-site.py [folder] [port]   (defaults: _site 8767)
import http.server, os, sys

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        p = self.path.split('?')[0].split('#')[0]
        if p != '/' and not os.path.splitext(p)[1] and os.path.exists(self.translate_path(p + '.html')):
            self.path = p + '.html' + self.path[len(p):]
        return super().send_head()

    def send_error(self, code, message=None, explain=None):
        # Like GitHub Pages: unknown addresses get the site's own 404 page.
        if code == 404 and os.path.exists('404.html'):
            body = open('404.html', 'rb').read()
            self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body))); self.end_headers()
            if self.command != 'HEAD': self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def log_message(self, *a):
        pass

folder = sys.argv[1] if len(sys.argv) > 1 else '_site'
port = int(sys.argv[2]) if len(sys.argv) > 2 else 8767
os.chdir(folder)
print(f'Serving {folder} at http://127.0.0.1:{port}')
http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
