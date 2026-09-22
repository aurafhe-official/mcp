#!/usr/bin/env python3
"""Diagnostic role-separated adapter for the supplied Keyxx C ABI.

This adapter cannot repair confidentiality defects inside a native engine.
The supplied build is diagnostic-only. Never deploy it with sensitive data.
"""
import argparse
import ctypes
import hashlib
import hmac
import json
import os
from pathlib import Path
import ssl
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

BUILD_HASH = 'fbb26df9df8ec58e150c21eb3acc0c646c02d0b4ac408e39930681aa2938f28a'
MAX_BODY = 16 * 1024 * 1024
COMPUTE = {
    'AddCipherInt': 2, 'AddCipherFloat': 2,
    'SubstractCipherInt': 2, 'SubstractCipherFloat': 2,
    'MultiplyCipherInt': 2, 'MultiplyCipherFloat': 2,
    'DivideCipherInt': 2, 'DivideCipherFloat': 2,
}


class GoString(ctypes.Structure):
    _fields_ = [('p', ctypes.c_char_p), ('n', ctypes.c_ssize_t)]


def gs(value):
    data = str(value).encode('utf8')
    return GoString(data, len(data))


def silence_native_output():
    # Native key generation prints internal material to fd 1. Keep Python's
    # diagnostic channel separate and discard native stdout/stderr entirely.
    out = os.fdopen(os.dup(1), 'w', buffering=1)
    err = os.fdopen(os.dup(2), 'w', buffering=1)
    with open(os.devnull, 'w') as sink:
        os.dup2(sink.fileno(), 1)
        os.dup2(sink.fileno(), 2)
    sys.stdout, sys.stderr = out, err


class Engine:
    def __init__(self, library):
        self.dll = ctypes.CDLL(str(Path(library).resolve()))
        self.dll.Init.argtypes = []
        self.dll.Init.restype = None
        self.dll.freePoint.argtypes = [ctypes.c_void_p]
        self.dll.freePoint.restype = None
        signatures = {name: [GoString] * count for name, count in COMPUTE.items()}
        signatures.update({name: [GoString] for name in ['LoadSK', 'LoadPK', 'LoadDict', 'EncryptInt', 'EncryptFloat', 'DecryptInt', 'DecryptFloat']})
        signatures.update({'GenSKB': [ctypes.c_int64] * 4 + [GoString], 'GenPKB': [GoString, GoString], 'GenDictB': [GoString, GoString, ctypes.c_double]})
        for name, signature in signatures.items():
            fn = getattr(self.dll, name)
            fn.argtypes, fn.restype = signature, ctypes.c_void_p
        self.dll.Init()

    def call(self, name, *args):
        ptr = getattr(self.dll, name)(*args)
        if not ptr:
            raise ValueError('Native engine returned null')
        try:
            value = ctypes.string_at(ptr).decode('utf8')
        finally:
            self.dll.freePoint(ptr)
        return value

    def status(self, name, *args):
        status = self.call(name, *args)
        if status not in ('', 'ok') and not status.startswith(('Keyxx ', 'SKB Keyxx ', 'PKB Keyxx ', 'DictB Keyxx ', 'DictBKeyxx ')):
            raise ValueError('Native key operation failed')


def serve(args, engine):
    token = os.environ.get('AFHE_RUNTIME_TOKEN', '')
    if len(token) < 32:
        raise ValueError('AFHE_RUNTIME_TOKEN must contain at least 32 characters')
    public_dir = Path(args.public_dir).resolve()
    for name in ['pkb', 'dictb']:
        if not (public_dir / name).is_file():
            raise ValueError('Public/evaluation material is missing')
    if (public_dir / 'skb').exists():
        raise ValueError('Public directory must not contain a secret-key file')
    key_id = hashlib.sha256((public_dir / 'pkb').read_bytes()).hexdigest()
    if args.role == 'compute':
        if args.secret_key:
            raise ValueError('Compute role refuses a secret-key path')
        engine.status('LoadPK', gs(public_dir / 'pkb'))
        engine.status('LoadDict', gs(public_dir / 'dictb'))
    else:
        if not args.secret_key or args.host not in ('127.0.0.1', '::1'):
            raise ValueError('Owner role requires a local secret key and a loopback listener')
        engine.status('LoadSK', gs(Path(args.secret_key).resolve()))

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def reply(self, code, body):
            data = json.dumps(body).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)

        def authorized(self):
            if not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
                self.reply(401, {'error': 'Unauthorized'})
                return False
            return True

        def do_GET(self):
            if not self.authorized(): return
            if self.path == '/health':
                self.reply(200, {'status': 'ok', 'role': args.role, 'keyId': key_id, 'secretKeyLoaded': args.role == 'owner', 'securityProfile': 'diagnostic-only'})
            elif self.path == '/functions' and args.role == 'compute':
                self.reply(200, {'arity1': [], 'arity2': list(COMPUTE), 'arity3': []})
            else:
                self.reply(404, {'error': 'Route unavailable for this role'})

        def do_POST(self):
            if not self.authorized(): return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if length < 1 or length > MAX_BODY or self.headers.get('Transfer-Encoding'):
                    self.reply(413, {'error': 'Invalid body size'}); return
                body = json.loads(self.rfile.read(length))
                if not isinstance(body, dict): raise ValueError()
                if args.role == 'compute' and self.path == '/call':
                    name, values = body.get('fn'), body.get('args')
                    if set(body) != {'fn', 'args'} or name not in COMPUTE or not isinstance(values, list) or len(values) != 2:
                        raise ValueError()
                    if any(not isinstance(v, str) or not v or len(v) > 2 * 1024 * 1024 for v in values): raise ValueError()
                    self.reply(200, {'result': engine.call(name, *(gs(v) for v in values))})
                    return
                if args.role == 'owner' and self.path in ('/encrypt/int', '/encrypt/float', '/decrypt/int', '/decrypt/float'):
                    action, domain = self.path.strip('/').split('/')
                    field = 'value' if action == 'encrypt' else 'ciphertext'
                    value = body.get(field)
                    if not isinstance(value, str) or not value or len(value) > 2 * 1024 * 1024: raise ValueError()
                    if action == 'encrypt' and (set(body) != {'value', 'public'} or body['public'] is not False): raise ValueError()
                    if action == 'decrypt' and set(body) != {'ciphertext'}: raise ValueError()
                    result = engine.call(action.capitalize() + domain.capitalize(), gs(value))
                    self.reply(200, {'ciphertext' if action == 'encrypt' else 'plaintext': result})
                    return
                self.reply(404, {'error': 'Route unavailable for this role'})
            except Exception:
                self.reply(400, {'error': 'Invalid request or native operation failed'})

    # HTTPServer is deliberately serial: the native engine is not thread-safe.
    server = HTTPServer((args.host, args.port), Handler)
    server.timeout = 30
    if args.cert and args.tls_key:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.load_cert_chain(args.cert, args.tls_key)
        server.socket = context.wrap_socket(server.socket, server_side=True)
    elif args.host not in ('127.0.0.1', '::1'):
        raise ValueError('Non-loopback compute listeners require TLS')
    print(json.dumps({'ready': True, 'role': args.role, 'port': server.server_port, 'keyId': key_id, 'securityProfile': 'diagnostic-only'}), flush=True)
    server.serve_forever()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['keygen', 'serve'])
    parser.add_argument('--library', required=True)
    parser.add_argument('--diagnostic', action='store_true', help='Required: synthetic data only; confidentiality release is blocked')
    parser.add_argument('--public-dir', required=True)
    parser.add_argument('--owner-dir')
    parser.add_argument('--secret-key')
    parser.add_argument('--role', choices=['owner', 'compute'], default='compute')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=0)
    parser.add_argument('--cert')
    parser.add_argument('--tls-key')
    args = parser.parse_args()
    if not args.diagnostic:
        raise ValueError('Native engine has not passed the confidentiality release gate. Diagnostic synthetic data only.')
    if hashlib.sha256(Path(args.library).read_bytes()).hexdigest() != BUILD_HASH:
        raise ValueError('Unrecognized engine build: validate ABI and update the recorded compatibility manifest first')
    os.umask(0o077)
    silence_native_output()
    engine = Engine(args.library)
    if args.action == 'keygen':
        if not args.owner_dir: raise ValueError('Owner directory is required')
        owner, public = Path(args.owner_dir), Path(args.public_dir)
        if owner.resolve() == public.resolve(): raise ValueError('Owner and public directories must differ')
        owner.mkdir(parents=True, mode=0o700, exist_ok=True)
        public.mkdir(parents=True, mode=0o700, exist_ok=True)
        if any(p.exists() for p in [owner / 'skb', public / 'pkb', public / 'dictb']): raise ValueError('Refusing to overwrite existing key material')
        engine.status('GenSKB', 2, 4, 2147483647, 512, gs(owner / 'skb'))
        engine.status('GenPKB', gs(owner / 'skb'), gs(public / 'pkb'))
        engine.status('GenDictB', gs(owner / 'skb'), gs(public / 'dictb'), 0.0001)
        print(json.dumps({'keyId': hashlib.sha256((public / 'pkb').read_bytes()).hexdigest(), 'securityProfile': 'diagnostic-only'}))
    else:
        serve(args, engine)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('Native adapter failed. Check role, paths, token, ABI build, and diagnostic-only configuration.', file=sys.stderr)
        raise SystemExit(1)
