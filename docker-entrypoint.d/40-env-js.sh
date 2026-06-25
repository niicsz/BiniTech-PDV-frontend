#!/bin/sh
set -e

cat > /usr/share/nginx/html/env.js <<EOF
window.__env = { apiBase: "${API_BASE:-}" };
EOF

echo "[40-env-js] env.js gerado com apiBase='${API_BASE:-}'"
