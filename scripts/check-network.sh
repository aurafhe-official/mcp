#!/usr/bin/env bash
set -euo pipefail
API="${AFHE_API_URL:-https://api.afhe.io:8443}"
echo "GET $API/health"
curl -skS --max-time 10 "$API/health"; echo
echo "GET $API/functions (arity counts)"
curl -skS --max-time 15 "$API/functions" | python3 -c 'import json,sys; d=json.load(sys.stdin); print({k:len(v) for k,v in d.items()})'
echo "TLS:"
HOSTPORT="${API#https://}"
HOST="${HOSTPORT%%:*}"
echo | openssl s_client -connect "$HOSTPORT" -servername "$HOST" 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || true
