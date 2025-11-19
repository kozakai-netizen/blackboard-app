#!/usr/bin/env bash
set -euo pipefail
PORT=${1:-3001}
UID=${2:-40824}
PLACE=${3:-dandoli-sample1}
EMP=${4:-12345678}

echo "== curl /api/health/my-keys (echo) =="
curl -s "http://localhost:${PORT}/api/health/my-keys?uid=${UID}&place=${PLACE}&emp=${EMP}" | jq .

echo
echo "== curl /api/user/my-keys =="
curl -s "http://localhost:${PORT}/api/user/my-keys?uid=${UID}&place=${PLACE}&emp=${EMP}" | jq .
echo
echo "→ サーバーログに [my-keys] input/output が出ているか確認してください。"
