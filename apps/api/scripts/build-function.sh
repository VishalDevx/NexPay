#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npx prisma generate

npx esbuild src/serverless.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --target=node20 \
  --external:@prisma/client \
  --outfile=dist/nexpay-api-bundle.cjs

echo "Bundle built: dist/nexpay-api-bundle.cjs"
