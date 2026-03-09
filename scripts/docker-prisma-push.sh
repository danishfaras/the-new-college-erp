#!/bin/bash
# Run prisma db push inside Docker (different TLS stack - fixes Atlas "fatal alert: InternalError" on some macOS)
set -e
cd "$(dirname "$0")/.."
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  exit 1
fi
export $(grep -v '^#' .env.local | xargs)
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set in .env.local"
  exit 1
fi
echo "Running prisma db push inside Docker..."
docker run --rm -v "$(pwd):/app" -w /app -e DATABASE_URL="$DATABASE_URL" node:20-alpine sh -c "npm install prisma --no-save && npx prisma db push"
echo "✅ Done"
