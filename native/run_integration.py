#!/usr/bin/env python3
"""Strict real-engine integration test. Requires the supplied native library.
No exceptions are converted into skipped tests. Synthetic data only.
"""
import json
import os
from pathlib import Path
import secrets
import selectors
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def ready(process):
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    try:
        if not selector.select(60): raise RuntimeError('Native process did not become ready')
        line = process.stdout.readline()
        if not line: raise RuntimeError('Native process exited before readiness')
        return json.loads(line)
    finally:
        selector.close()


def main():
    library = os.environ.get('AFHE_NATIVE_LIBRARY')
    if not library: raise RuntimeError('Set AFHE_NATIVE_LIBRARY to the supplied .so file')
    library = str(Path(library).resolve())
    with tempfile.TemporaryDirectory(prefix='aura-native-test-') as temp:
        root = Path(temp)
        owner = Path(os.environ.get('AFHE_NATIVE_TEST_OWNER_DIR', root / 'owner'))
        public = Path(os.environ.get('AFHE_NATIVE_TEST_PUBLIC_DIR', root / 'public'))
        base = [sys.executable, str(ROOT / 'native/keyxx_runtime.py')]
        common = ['--library', library, '--diagnostic', '--public-dir', str(public)]
        if not (owner / 'skb').exists():
            subprocess.run(base + ['keygen'] + common + ['--owner-dir', str(owner)], check=True, timeout=300, stdout=subprocess.PIPE)
        owner_token, compute_token = secrets.token_hex(32), secrets.token_hex(32)
        runtime_env = {'PATH': os.environ['PATH']}
        processes = []
        try:
            owner_process = subprocess.Popen(base + ['serve'] + common + ['--role', 'owner', '--secret-key', str(owner / 'skb')], env=dict(runtime_env, AFHE_RUNTIME_TOKEN=owner_token), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            processes.append(owner_process)
            owner_info = ready(owner_process)
            compute_process = subprocess.Popen(base + ['serve'] + common + ['--role', 'compute'], cwd=temp, env=dict(runtime_env, AFHE_RUNTIME_TOKEN=compute_token), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            processes.append(compute_process)
            compute_info = ready(compute_process)
            assert owner_info['keyId'] == compute_info['keyId']
            env = dict(os.environ, TEST_OWNER_TOKEN=owner_token, TEST_COMPUTE_TOKEN=compute_token, TEST_OWNER_URL='http://127.0.0.1:' + str(owner_info['port']), TEST_COMPUTE_URL='http://127.0.0.1:' + str(compute_info['port']), TEST_KEY_ID=owner_info['keyId'], TEST_DIR=temp)
            subprocess.run(['node', 'native/integration.mjs'], cwd=ROOT, env=env, check=True, timeout=120)
        finally:
            for process in processes:
                process.terminate()
            for process in processes:
                try: process.wait(timeout=5)
                except subprocess.TimeoutExpired: process.kill(); process.wait()


if __name__ == '__main__':
    main()
