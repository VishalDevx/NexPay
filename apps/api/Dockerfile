FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json turbo.json tsconfig.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm install

COPY . .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --filter=@nexpay/api

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nexpay && adduser --system --uid 1001 nexpay

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages ./packages

USER nexpay

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
