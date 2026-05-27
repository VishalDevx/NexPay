FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json turbo.json tsconfig.json ./
RUN mkdir -p apps/api apps/merchant-portal apps/admin-portal packages/shared packages/sdk
COPY apps/api/package.json ./apps/api/
COPY apps/merchant-portal/package.json ./apps/merchant-portal/
COPY apps/admin-portal/package.json ./apps/admin-portal/
COPY packages/shared/package.json ./packages/shared/
COPY packages/sdk/package.json ./packages/sdk/
RUN npm install

COPY . .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npx tsc -p apps/api/tsconfig.build.json

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nexpay && adduser --system --uid 1001 nexpay

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages ./packages

RUN chown -R nexpay:nexpay /app/node_modules /app/apps /app/packages

USER nexpay

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
