#!/bin/sh
set -e

cat > /usr/share/nginx/html/env.js <<EOF
window.__env = { apiBase: "${API_BASE:-}", importApiBase: "${IMPORT_API_BASE:-}", fiscalApiBase: "${FISCAL_API_BASE:-}", gaMeasurementId: "${GA_MEASUREMENT_ID:-}" };
EOF

echo "[40-env-js] configuração de APIs gerada"
