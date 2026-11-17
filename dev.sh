#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8123}"
cd "$(dirname "$0")"

echo "Cabral Ferramentas rodando em http://127.0.0.1:${PORT}/index.html"
echo "Pressione Ctrl+C para parar."
exec python3 -m http.server "$PORT" --bind 127.0.0.1
