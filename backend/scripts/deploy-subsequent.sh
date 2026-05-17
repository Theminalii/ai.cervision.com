#!/bin/sh
set -eu

BACKEND_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$BACKEND_DIR"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created backend .env from .env.example"
fi

composer install --no-dev --optimize-autoloader

php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan queue:restart || true

echo "Backend subsequent deploy completed."
