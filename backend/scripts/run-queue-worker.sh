#!/bin/sh
set -eu

BACKEND_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$BACKEND_DIR"

php artisan queue:work redis \
  --queue=default \
  --sleep=1 \
  --tries=3 \
  --timeout=120 \
  --max-time=3600 \
  --memory=512
