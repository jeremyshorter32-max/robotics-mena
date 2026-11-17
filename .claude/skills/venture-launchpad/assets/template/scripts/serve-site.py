# Local preview server for the built site (_site/), with clean URLs like GitHub Pages (/map -> map.html).
# Usage: python3 scripts/serve-site.py [folder] [port]   (defaults: _site 8767)
import http.server, os, sys

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        p = self.path.split('?')[0].split('#')[0]
        if p != '/' and not os.path.splitext(p)[1] and os.path.exists(self.translate_path(p + '.html')):
            self.path = p + '.html' + self.path[len(p):]
        return super().send_head()

    def log_message(self, *a):
        pass

folder = sys.argv[1] if len(sys.argv) > 1 else '_site'
port = int(sys.argv[2]) if len(sys.argv) > 2 else 8767
os.chdir(folder)
print(f'Serving {folder} at http://127.0.0.1:{port}')
http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
