#!/bin/sh
set -eu

BACKEND_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$BACKEND_DIR"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created backend .env from .env.example"
fi

composer install --no-dev --optimize-autoloader

php artisan key:generate --force
php artisan migrate --force
php artisan db:seed --force
php artisan config:cache
php artisan route:cache
php artisan queue:restart || true

echo "Backend first deploy completed."
echo "Start with: php artisan serve --host=127.0.0.1 --port=8000"
