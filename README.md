# NexPay — Payment Infrastructure Platform

**Multi-tenant payment infrastructure for SaaS businesses.** Payment intents, double-entry ledger, wallet reconciliation, webhooks with retries/DLQ, fraud scoring, subscription billing, payouts, disputes, and reconciliation — from one platform.

## Why I built this

To understand real-world financial backend systems: ledger, reconciliation, idempotency, webhooks, payouts, and async reliability. This project demonstrates production-grade backend engineering patterns in a coherent fintech product.

## Core Capabilities

| Module | Description |
|--------|-------------|
| **Payment Intents** | Full lifecycle: initiated → processing → authorized → captured → settled |
| **Double-Entry Ledger** | Immutable accounting with advisory locks, GL, trial balance, income statement |
| **Wallet Balances** | Redis-backed real-time balances with ledger reconciliation |
| **Refunds** | Full/partial refunds with automatic ledger reversal |
| **Payouts** | Manual/scheduled payouts with batch processing |
| **Webhooks** | HMAC-SHA256 signed delivery with exponential backoff retry and DLQ |
| **Reconciliation** | Daily payment-vs-ledger matching with drift detection |
| **Fraud Scoring** | Rule-based engine (velocity, geo, amount, device, account age, currency) |
| **Disputes** | Lifecycle management with evidence upload and reserve adjustment |
| **Subscription Billing** | Plans, recurring invoices, dunning |
| **Multi-Tenancy** | Isolated merchant workspaces with RBAC |
| **API Keys** | Test/live keys with scoped permissions |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Dashboard (Next.js)               │
│           Merchant Portal / Admin Portal             │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                API Gateway (Express)                 │
│     Rate Limit → Auth → Idempotency → Sandbox       │
└──────┬──────────────┬──────────────┬────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌───▼────────────────┐
│  Services   │ │  Workers   │ │  Event System       │
│ Payments    │ │ Webhook    │ │  Outbox Pattern     │
│ Ledger      │ │ Payout     │ │  → BullMQ           │
│ Billing     │ │ Reconcile  │ │  → Webhook Delivery │
│ Fraud       │ │ Billing    │ │  → DLQ              │
└──────┬──────┘ └─────┬──────┘ └─────────────────────┘
       │              │
┌──────▼──────────────▼──────────────────────────────┐
│           PostgreSQL / Redis / BullMQ               │
│        Primary DB / Cache / Job Queues              │
└─────────────────────────────────────────────────────┘
```

## Money Movement Example

```
Customer pays ₹1,000
  → PaymentIntent created
  → Fraud check (score < 50: approve)
  → Gateway authorization
  → Double-entry ledger:
      DR Customer Cash Account    ₹1,000
      CR Merchant Revenue         ₹  970
      CR Platform Fee             ₹   30
  → Wallet balance updated (Redis)
  → Outbox event created
  → Webhook delivery (payment.captured)
  → GL entry posted
```

## Reliability Design

| Pattern | Implementation |
|---------|---------------|
| **Idempotency** | Idempotency-Key header with Redis lock + Prisma cache |
| **Outbox Pattern** | Events created in same DB transaction as payment |
| **Retry + DLQ** | Exponential backoff (1s → 4s → 16s → 64s → 256s), dead letter after 5 |
| **Advisory Locks** | PostgreSQL `pg_advisory_xact_lock` prevents concurrent balance corruption |
| **Reconciliation** | Daily job detects payment-ledger-wallet mismatches with auto-correction |
| **Audit Logs** | Every state transition, admin action, and security event recorded |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20, TypeScript |
| **API** | Express 4 |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Cache** | Redis 7 |
| **Queues** | BullMQ |
| **Frontend** | Next.js 14, React 18, Tailwind CSS |
| **Charts** | Recharts |
| **Auth** | JWT, API Key (SHA-256), TOTP MFA |
| **Validation** | Zod |
| **Infra** | Docker, Docker Compose, Nginx |
| **CI/CD** | GitHub Actions |

## Project Structure

```
nexpay/
├── apps/
│   ├── api/                  # Express REST API (40+ routers)
│   │   ├── prisma/           # Schema + seed (standard + golden)
│   │   ├── src/
│   │   │   ├── config/       # DB, Redis, env config
│   │   │   ├── middleware/   # Auth, rate-limit, idempotency, metrics, sandbox
│   │   │   ├── modules/      # Feature modules (payments, ledger, etc.)
│   │   │   ├── workers/      # BullMQ workers (webhook, payout, reconciliation)
│   │   │   └── __tests__/    # Unit/integration tests
│   │   └── Dockerfile
│   ├── merchant-portal/      # Next.js merchant dashboard (30+ pages)
│   ├── admin-portal/         # Next.js admin panel
├── packages/
│   ├── sdk/                  # TypeScript client SDK
│   └── shared/               # Shared types/schemas
├── docs/
│   ├── ARCHITECTURE.md       # System architecture
│   ├── FAILURE_MODES.md      # Failure handling documentation
│   ├── SECRETS.md            # GitHub Secrets & env configuration
│   └── TENANCY.md            # Multi-tenancy design
├── .github/workflows/        # CI/CD pipelines
└── docker-compose.yml        # Local dev setup
```

## Local Setup

**Prerequisites:** Node.js 20+, Docker, Docker Compose

```bash
# 1. Start infrastructure
docker compose up -d postgres redis

# 2. Configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET and ENCRYPTION_KEY (min 16 chars each)
# See docs/SECRETS.md for details

# 3. Install dependencies
npm ci

# 5. Generate Prisma client
npm run db:generate

# 6. Run migrations
npm run db:migrate

# 7. Seed demo data
npm run seed:demo

# 8. Start development
npm run dev
```

The API runs on `http://localhost:3001`, merchant portal on `http://localhost:3000`, admin portal on `http://localhost:3002`.

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | `admin@nexpay.dev` | `demo1234` |
| Merchant Owner | `merchant@nexpay.dev` | `demo1234` |
| TechStore | `techstore@nexpay.dev` | `demo1234` |
| FreshFoods | `freshfoods@nexpay.dev` | `demo1234` |
| Developer | `developer@nexpay.dev` | `demo1234` |

## API Documentation

Swagger UI: `http://localhost:3001/api/v1/docs`

OpenAPI spec: `http://localhost:3001/api/v1/openapi.json`

## Test Strategy

```
Unit tests:    80+ — Ledger invariants, wallet balance, state machines, fraud engine
Integration:   40+ — Payment flow, refunds, payouts, webhooks, reconciliation
E2E:           10+ — Merchant onboarding, payment capture, refund, dispute resolution
```

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run apps/api/src/__tests__/ledger.test.ts
```

## System Integrity

The admin dashboard includes a **System Integrity** tab that monitors:

- ✅ Ledger balanced (debit = credit)
- ✅ Wallet vs ledger match
- ⚠️ Webhook delivery retries
- ✅ Dead letter queue
- ✅ Reconciliation health
- ✅ Outbox lag
- ❌ Failed jobs
- ✅ Payment success rate

## Demo: End-to-End Money Flow

Two seed options:

```bash
# A) Full demo (5 merchants, 510 payments, all features)
npm run seed:demo

# B) Golden demo — single merchant, deterministic money flow (recommended for demos)
npm run seed:golden
```

### Golden Demo (`npm run seed:golden`)

Creates **Acme Corp** (`merchant@nexpay.dev` / `demo1234`) with a complete, verifiable money flow:

| Step | What happens | Amount |
|------|-------------|--------|
| Payment #1 | Alice buys a T-shirt → captured → settled | $100.00 |
| Payment #2 | Alice buys headphones → captured → settled | $250.00 |
| Payment #3 | Bob buys a keyboard → settled → **$150 refunded** | $500.00 |
| Payment #4 | Bob buys a USB hub → settled → **disputed → merchant wins** | $75.00 |
| Payment #5 | Alice buys a monitor → captured → settled | $1,000.00 |

**What gets created:**
- 5 payments with full state machine transitions
- Double-entry ledger (asset, liability, revenue) — debit = credit invariant
- Wallet credited with net settlements
- Outbox events + webhook deliveries for each payment
- 1 refund with ledger reversal
- 1 resolved dispute
- Settlement batch with reconciliation matches
- 31 daily balance records
- API keys (live + test), bank account, webhook endpoint
- Fee schedule, reserve config (10% rolling reserve)

**Verifiable totals:**
- Total processed: **$1,925.00**
- Total fees: **$58.05** (2.9% + $0.30 per transaction)
- Total refunded: **$150.00**
- Net merchant payable: **$1,716.95**
- Ledger: debit = credit ✅
```

## API Quick Start

```typescript
import NexPay from "nexpay-sdk";

const nexpay = new NexPay({
  apiKey: process.env.NEXPAY_SECRET_KEY,
});

// Create a payment
const payment = await nexpay.paymentIntents.create({
  amount: 1000,
  currency: "INR",
  customerId: "cus_123",
  paymentMethod: { type: "card", last4: "4242" },
});

// Capture
await nexpay.paymentIntents.capture(payment.id);

// Refund
await nexpay.refunds.create({
  paymentId: payment.id,
  amount: 500,
});
```

## Known Limitations

- **Bank disbursement**: Payouts use simulated bank transfers (no real bank API integration)
- **SMS MFA**: SMS OTP is simulated via console log (no Twilio integration)
- **Email sending**: Requires RESEND_API_KEY env var to be set for real email delivery
- **Python SDK**: Planned but not yet implemented
- **Read replicas**: Architecture supports read replicas for reporting but not configured
- **Real-time updates**: WebSocket-based live updates planned for future

## License

MIT

---

*Built as a portfolio project demonstrating production-grade backend engineering patterns in a fintech context.*
