#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example"
fi

npm ci
npm run build

echo "Frontend build is ready."
echo "Start with: npm run start"
