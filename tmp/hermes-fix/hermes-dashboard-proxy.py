#!/usr/bin/env python3
import http.client
import re
import socketserver
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlsplit


LISTEN = ("172.18.0.1", 19119)
TARGET_HOST = "127.0.0.1"
TARGET_PORT = 9119
TOKEN_RE = re.compile(rb'window\.__HERMES_SESSION_TOKEN__="([^"]+)"')


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


class Proxy(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    session_token = None

    def log_message(self, fmt, *args):
        return

    @classmethod
    def refresh_session_token(cls):
        conn = http.client.HTTPConnection(TARGET_HOST, TARGET_PORT, timeout=10)
        try:
            conn.request("GET", "/", headers={"Host": f"{TARGET_HOST}:{TARGET_PORT}"})
            resp = conn.getresponse()
            body = resp.read()
        finally:
            conn.close()

        match = TOKEN_RE.search(body)
        if match:
            cls.session_token = match.group(1).decode("ascii")
        return cls.session_token

    def _proxy(self):
        parsed = urlsplit(self.path)
        path = parsed.path or "/"
        target = self.path
        body = None

        length = self.headers.get("Content-Length")
        if length:
            body = self.rfile.read(int(length))

        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower()
            not in {
                "connection",
                "keep-alive",
                "proxy-authenticate",
                "proxy-authorization",
                "te",
                "trailers",
                "transfer-encoding",
                "upgrade",
                "host",
                "content-length",
            }
        }
        headers["Host"] = f"{TARGET_HOST}:{TARGET_PORT}"

        if path.startswith("/api/") and "x-hermes-session-token" not in {
            key.lower() for key in headers
        }:
            token = self.session_token or self.refresh_session_token()
            if token:
                headers["x-hermes-session-token"] = token

        if body is not None:
            headers["Content-Length"] = str(len(body))

        conn = http.client.HTTPConnection(TARGET_HOST, TARGET_PORT, timeout=60)
        try:
            conn.request(self.command, target, body=body, headers=headers)
            resp = conn.getresponse()
            data = resp.read()

            if resp.status == 401 and path.startswith("/api/"):
                conn.close()
                self.refresh_session_token()
                headers["x-hermes-session-token"] = self.session_token or ""
                conn = http.client.HTTPConnection(TARGET_HOST, TARGET_PORT, timeout=60)
                conn.request(self.command, target, body=body, headers=headers)
                resp = conn.getresponse()
                data = resp.read()

            self.send_response(resp.status, resp.reason)
            excluded = {
                "connection",
                "keep-alive",
                "proxy-authenticate",
                "proxy-authorization",
                "te",
                "trailers",
                "transfer-encoding",
                "upgrade",
                "content-length",
            }
            for key, value in resp.getheaders():
                if key.lower() not in excluded:
                    self.send_header(key, value)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(data)
        finally:
            conn.close()

    def do_GET(self):
        self._proxy()

    def do_HEAD(self):
        self._proxy()

    def do_POST(self):
        self._proxy()

    def do_PUT(self):
        self._proxy()

    def do_PATCH(self):
        self._proxy()

    def do_DELETE(self):
        self._proxy()

    def do_OPTIONS(self):
        self._proxy()


def main():
    Proxy.refresh_session_token()
    with ThreadingHTTPServer(LISTEN, Proxy) as server:
        server.serve_forever()


if __name__ == "__main__":
    main()
