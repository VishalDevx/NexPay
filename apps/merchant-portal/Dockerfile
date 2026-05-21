FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json turbo.json ./
COPY apps/merchant-portal/package.json ./apps/merchant-portal/
RUN npm install

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --filter=@nexpay/merchant-portal

EXPOSE 3000
CMD ["npm", "run", "start", "--filter=@nexpay/merchant-portal"]
