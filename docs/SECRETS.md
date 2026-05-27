# GitHub Secrets Configuration

Required secrets for CI/CD and production deployment.

## Repository Secrets

Configure these in GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required | Description | Example |
|--------|----------|-------------|---------|
| `JWT_SECRET` | Yes | JWT signing key (min 16 chars) | `a7f3c9d1e5b8a2d4f6c0e3a7b9d1f5c8` |
| `ENCRYPTION_KEY` | Yes | Encryption key (min 16 chars) | `f8a2d4f6c0e3a7b9d1f5c8a7f3c9d1e5` |
| `RESEND_API_KEY` | No | Resend API key for email | `re_abc123...` |
| `FX_API_KEY` | No | Foreign exchange API key | `fx_live_...` |
| `DOCKER_REGISTRY` | No | Container registry URL | `ghcr.io/your-org` |
| `DOCKER_USERNAME` | No | Registry username | `your-username` |
| `DOCKER_PASSWORD` | No | Registry token/password | `ghp_...` |

The following are **not secrets** but environment variables — GitHub provides them as default env vars or can be set as variables:
- `DATABASE_URL` — provided inline in CI via service containers
- `REDIS_URL` — provided inline in CI via service containers

## Where Each Secret Is Used

### CI workflow (`.github/workflows/ci.yml`)

| Job | Secret | Where Used |
|-----|--------|------------|
| `test` | `JWT_SECRET`, `ENCRYPTION_KEY` | Unit/integration tests |
| `e2e` | `JWT_SECRET`, `ENCRYPTION_KEY` | E2E test API server |

The CI currently uses hardcoded test values (`nexpay-ci-jwt-secret-min-16-chars`, etc.) because service containers provide ephemeral databases. For PRs from forks, these values are safe to keep hardcoded since they only grant access to disposable test infrastructure.

### Docker workflow (`.github/workflows/docker.yml`)

When configured to push to a registry, this workflow needs `DOCKER_REGISTRY`, `DOCKER_USERNAME`, and `DOCKER_PASSWORD`.

### Production deployment (`docker-compose.prod.yml`)

The production compose file references these via shell variable interpolation:

```yaml
environment:
  JWT_SECRET: ${JWT_SECRET}
  ENCRYPTION_KEY: ${ENCRYPTION_KEY}
  RESEND_API_KEY: ${RESEND_API_KEY}
  FX_API_KEY: ${FX_API_KEY}
```

Create a `.env` file on the deployment server with the production values:

```bash
# On the deployment server
cat > .env << 'EOF'
JWT_SECRET=prod-jwt-secret-...
ENCRYPTION_KEY=prod-encryption-key-...
RESEND_API_KEY=re_prod_...
FX_API_KEY=fx_prod_...
DB_PASSWORD=prod-db-password
EOF
```

Then deploy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

## Setting Up Secrets for Local Development

For local development, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required values to change:
- `JWT_SECRET` — generate a random 32+ char string
- `ENCRYPTION_KEY` — generate a random 32+ char string
- `RESEND_API_KEY` — optional, leave blank to run without email

```bash
# Generate secure random values (macOS/Linux)
openssl rand -hex 32  # for JWT_SECRET or ENCRYPTION_KEY
```

## CI Test Values

The test values used in CI are safe because they only grant access to ephemeral PostgreSQL and Redis containers created per-job:

```yaml
JWT_SECRET: nexpay-ci-jwt-secret-min-16-chars
ENCRYPTION_KEY: nexpay-ci-encryption-key-32chars
```

These values are **not** sensitive — they are the same as default test fixtures. Do not use these values in production.

## Rotating Secrets

1. Update the value in GitHub Secrets
2. Update `.env` on all deployment servers
3. Restart services: `docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d`
4. Existing JWTs signed with the old secret will become invalid — users will need to re-login

## Validation

Run this to verify your `.env` file has all required fields:

```bash
npx tsx -e "
require('dotenv').config({ path: '.env' });
const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  process.exit(1);
}
console.log('All required env vars are set');
"
```
