#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"

if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 não encontrado. Instale o Python 3 para usar este script." >&2
    exit 1
fi

if command -v lsof >/dev/null 2>&1 && lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "A porta $PORT já está em uso. Tente: $0 8001" >&2
    exit 1
fi

python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!

trap 'kill "$SERVER_PID" 2>/dev/null' EXIT

echo "Servidor rodando em http://localhost:$PORT"
echo "Pressione Ctrl+C para parar."

sleep 1

if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:$PORT"
elif command -v open >/dev/null 2>&1; then
    open "http://localhost:$PORT"
fi

wait "$SERVER_PID"