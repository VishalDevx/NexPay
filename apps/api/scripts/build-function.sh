#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npx prisma generate

# Push schema and sync demo data when a database is configured (Vercel build env)
if [ -n "${DATABASE_URL:-}" ]; then
  echo "Pushing Prisma schema..."
  npx prisma db push --schema=prisma/schema.prisma --accept-data-loss
  echo "Running demo seed..."
  npx tsx prisma/demo-seed.ts
fi

npx esbuild src/serverless.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --target=node20 \
  --external:@prisma/client \
  --outfile=dist/nexpay-api-bundle.cjs

echo "Bundle built: dist/nexpay-api-bundle.cjs"
