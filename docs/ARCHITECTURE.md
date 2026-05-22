# NexPay Architecture

## System Overview

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        MC[Merchant Portal<br/>Next.js 14]
        AP[Admin Portal<br/>Next.js 14]
        SDK[Node.js/Python SDK]
        API_Direct[REST API Consumers]
    end

    subgraph "Edge / Gateway"
        NGINX[NGINX Reverse Proxy]
        RL[Rate Limiter]
    end

    subgraph "API Layer"
        API[Express API Server<br/>Port 3003]
        WS[Webhook Dispatcher]
        BG[Background Workers<br/>BullMQ]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL)]
        RC[(Redis)]
    end

    subgraph "External"
        GP[Payment Gateways<br/>Stripe / Razorpay]
        WH_CB[Merchant Webhook<br/>Endpoints]
        BANK[Bank Partners]
    end

    MC --> NGINX
    AP --> NGINX
    SDK --> NGINX
    API_Direct --> NGINX
    NGINX --> API
    API --> PG
    API --> RC
    WS --> WH_CB
    BG --> RC
    BG --> PG
    API --> GP
    WS --> RC
```

### Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Server | Express (TypeScript) | REST API, request handling |
| Merchant Portal | Next.js 14 (App Router) | Merchant dashboard UI |
| Admin Portal | Next.js 14 (App Router) | Admin operations UI |
| Database | PostgreSQL 16 | Primary data store |
| Cache / Queue | Redis 7 + BullMQ | Caching, job queues |
| ORM | Prisma | Type-safe database access |
| Auth | JWT + API Keys (HMAC) | Authentication |
| Containerization | Docker + Compose | Dev/Prod deployment |
| Package Manager | npm workspaces + Turborepo | Monorepo management |
| Payments | Stripe, Razorpay | Payment processing |
| Queue Workers | BullMQ | Webhooks, payouts, reconciliation |

### Monorepo Structure

```
nexpay/
├── apps/
│   ├── api/                       # Express API server
│   │   ├── prisma/                # Database schema & migrations
│   │   ├── src/
│   │   │   ├── config/            # DB, Redis, env config
│   │   │   ├── middleware/        # Auth, rate-limit, metrics, etc.
│   │   │   ├── modules/           # Feature modules
│   │   │   │   ├── merchants/     # Merchant management
│   │   │   │   ├── payments/      # Payment processing
│   │   │   │   ├── webhooks/      # Webhook delivery system
│   │   │   │   ├── payouts/       # Payout processing
│   │   │   │   ├── fraud/         # Fraud detection engine
│   │   │   │   ├── ledger/        # Double-entry accounting
│   │   │   │   ├── reconciliation/# Payment vs ledger matching
│   │   │   │   ├── sandbox/       # Test environment + chaos
│   │   │   │   ├── gateway/       # Payment gateway abstraction
│   │   │   │   └── ...            # Other modules
│   │   │   ├── workers/           # BullMQ workers
│   │   │   └── index.ts           # App entry point
│   │   └── package.json
│   ├── merchant-portal/           # Next.js merchant dashboard
│   └── admin-portal/              # Next.js admin dashboard
├── packages/
│   ├── sdk/                       # Client SDK (Node.js)
│   └── shared/                    # Shared types/utils
├── docker-compose.yml             # Dev environment
├── docker-compose.prod.yml        # Production environment
├── nginx.conf                     # Reverse proxy config
├── turbo.json                     # Turborepo pipeline
└── package.json                   # Root workspace
```

## Database Schema

### Entity Relationship Overview

```mermaid
erDiagram
    Merchant ||--o{ Payment : "has"
    Merchant ||--o{ ApiKey : "has"
    Merchant ||--o{ WebhookEndpoint : "has"
    Merchant ||--o{ Payout : "receives"
    Merchant ||--o{ Dispute : "involved in"
    Merchant ||--o{ Customer : "owns"
    Merchant ||--o{ Wallet : "has"
    Merchant ||--o{ Account : "has ledger accounts"
    Payment ||--o{ LedgerEntry : "generates"
    Payment ||--o{ WebhookDelivery : "triggers"
    Payment ||--o{ Refund : "can have"
    Payment ||--o{ FraudEvent : "may have"
    Payment ||--o{ PayoutItem : "included in"
    WebhookEndpoint ||--o{ WebhookDelivery : "delivers to"
    Account ||--o{ LedgerEntry : "has"
    Wallet ||--o{ WalletTxn : "records"
    Payout ||--o{ PayoutItem : "contains"
```

### Key Models

- **Merchant** — Core entity. Stores identity, KYC status, MFA config, settings. Goes through lifecycle: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → ACTIVE.
- **Payment** — Transaction record. State machine: INITIATED → PROCESSING → AUTHORIZED → CAPTURED → SETTLED. Terminal states: FAILED, REFUNDED, DISPUTED.
- **WebhookEndpoint** — Registered callback URL with event filter list and HMAC secret hash.
- **WebhookDelivery** — Outbox record for each webhook attempt. Tracks status, retries, HTTP response.
- **LedgerEntry** — Double-entry accounting record. Every payment creates debit/credit pairs.
- **Payout** — Settlement payout to merchant bank account. Contains multiple PayoutItems.
- **FraudEvent** — Per-payment fraud scoring. Records which rules triggered and scores.
- **OutboxEvent** — Transactional outbox for reliable event publishing.
- **ReconciliationMatch** — Drift detection record between payment and ledger/settlement data.

### Indexing Strategy

- **Payments**: `(merchantId)`, `(idempotencyKey)`, `(status)` — core query paths
- **WebhookDeliveries**: `(status, nextRetryAt)` — worker polling, `(endpointId)` — endpoint lookup
- **LedgerEntries**: `(accountId)`, `(paymentId)`, `(createdAt)` — reporting and reconciliation
- **OutboxEvents**: `(status, createdAt)` — outbox worker polling
- **ReconciliationMatches**: `(runId)`, `(matchType)`, `(sourceType, sourceId)`
- **IdempotencyKeys**: `(merchantId, key)` — unique, `(expiresAt)` — TTL cleanup

### Migration Approach

- Prisma Migrate for schema versioning
- Migrations run at container startup via entrypoint script
- Rollback via `prisma migrate resolve --rolled-back`
- Zero-downtime migrations: additive changes only, no backfill in same deploy

## Transaction Lifecycle

### State Machine

```mermaid
stateDiagram-v2
    [*] --> INITIATED
    INITIATED --> PROCESSING: Payment submitted
    PROCESSING --> FRAUD_CHECK: Passes validation
    FRAUD_CHECK --> AUTHORIZED: Score < 50
    FRAUD_CHECK --> DECLINED: Score >= 80
    FRAUD_CHECK --> REVIEW: Score 50-80
    REVIEW --> AUTHORIZED: Manual approve
    REVIEW --> DECLINED: Manual decline
    AUTHORIZED --> CAPTURED: Capture succeeds
    CAPTURED --> SETTLED: Settlement complete
    CAPTURED --> REFUNDED: Full refund
    SETTLED --> REFUNDED: Refund issued
    CAPTURED --> DISPUTED: Chargeback filed
    SETTLED --> DISPUTED: Chargeback filed
    DISPUTED --> REFUNDED: Merchant lost
    DISPUTED --> CAPTURED: Merchant won
    FAILED --> [*]
    DECLINED --> [*]
    REFUNDED --> [*]
```

### Step-by-Step Flow

1. **Initiation** — Merchant SDK calls POST `/v1/payments/charges` with amount, currency, customer data.
2. **Idempotency Check** — If `Idempotency-Key` header present, checks for existing result. Returns cached response if found.
3. **Fraud Check** — Payment passes through fraud scoring engine. Rules sum to a 0-100 score.
4. **Authorization** — Payment is sent to configured gateway (Stripe/Razorpay) for authorization hold.
5. **Capture** — Authorization is captured. Ledger entries are created. Webhook `payment.captured` is dispatched.
6. **Settlement** — After settlement period (T+1 or T+2), payment status moves to SETTLED.
7. **Payout Inclusion** — Settled payments become eligible for the next payout cycle.

### Error Handling at Each Step

| Step | Error | Handling |
|------|-------|----------|
| Initiation | Invalid params | 422 with field-level errors |
| Fraud Check | Engine timeout | Default to APPROVE (fail open) |
| Authorization | Gateway timeout | Retry 3x with backoff, then FAILED |
| Authorization | Card declined | Payment → FAILED, webhook sent |
| Capture | Gateway error | Retry queue with exponential backoff |
| Settlement | Missing settlement file | Alert ops, manual reconciliation |
| Webhook | Endpoint down | 5 retries (exponential), then DEAD_LETTER |

## Ledger Design

### Double-Entry Accounting

Every financial transaction creates balanced debit/credit entries across accounts. The system uses a standard chart of accounts with five account types.

### Account Types

| Type | Normal Balance | Examples |
|------|---------------|----------|
| **Asset** | Debit | Bank accounts, settlement accounts, reserve accounts |
| **Liability** | Credit | Customer balances, unsettled funds, payables |
| **Revenue** | Credit | Processing fees, markup fees |
| **Expense** | Debit | Gateway fees, chargeback fees, operational costs |
| **Equity** | Credit | Retained earnings, owner's capital |

### Example: Payment Flow Through Ledger

For a $100 payment with 2.9% + $0.30 fee:

```
Step 1: Capture
  Debit  Asset:SettlementAccount    $100.00
  Credit Liability:Unsettled        $100.00

Step 2: Fee Recognition
  Debit  Liability:Unsettled        $3.20
  Credit Revenue:ProcessingFees     $2.90
  Credit Revenue:FixedFees          $0.30

Step 3: Settlement
  Debit  Liability:Unsettled        $96.80
  Credit Asset:BankAccount          $96.80
```

### Reserve Accounting

- A configurable percentage (default 10%) of each payment is held in reserve
- Reserve is released after the reserve release delay (default 90 days)
- Journal entries:
  ```
  Debit  Liability:Unsettled        $10.00
  Credit Liability:Reserve           $10.00
  ```
- On release:
  ```
  Debit  Liability:Reserve           $10.00
  Credit Liability:Unsettled         $10.00
  ```

### GL (General Ledger) Integration

- Full chart of accounts with hierarchical account codes
- Journal entries with reversal support
- Period-based account balances for reporting
- Audit trail via `LedgerAdjustment` for manual corrections

## Webhook Delivery Design

### Outbox Pattern

```mermaid
sequenceDiagram
    participant Payment
    participant Outbox
    participant Worker
    participant Endpoint

    Payment->>Outbox: Create event (transactional)
    Outbox-->>Payment: Event ID
    Note over Payment,Outbox: Same DB transaction
    Worker->>Outbox: Poll for PENDING events
    Outbox-->>Worker: Batch of events
    Worker->>Endpoint: POST payload + HMAC signature
    alt 2xx Response
        Endpoint-->>Worker: 200 OK
        Worker->>Outbox: Mark PUBLISHED
    else 4xx/5xx or Timeout
        Worker->>Outbox: Increment retryCount
        alt Max retries reached
            Worker->>Outbox: Mark FAILED → DLQ
        else
            Worker->>Outbox: Schedule next retry
        end
    end
```

### Delivery Flow

```
Payment → OutboxEvent (PENDING) → Worker picks up → POST to endpoint
                                                      ↓
                                            Response 2xx? → DELIVERED
                                            Response 4xx? → Retry
                                            Timeout?      → Retry
                                            Max retries   → DEAD_LETTER
```

### Retry Strategy

| Attempt | Delay (approx) | Cumulative |
|---------|---------------|------------|
| 1 | 1s | 1s |
| 2 | 2s | 3s |
| 3 | 4s | 7s |
| 4 | 8s | 15s |
| 5 | 16s | 31s |

After 5 failed attempts: status moves to `DEAD_LETTER`. Manual retry/replay available via API.

### Signature Verification (HMAC-SHA256)

```
Header: x-nexpay-signature: <hmac>
Payload: JSON.stringify(body)
Secret: Per-endpoint signing secret (configurable/rotatable)

HMAC = hex( HMAC-SHA256(secret, payload) )
```

Verification uses `crypto.timingSafeEqual` to prevent timing attacks.

## Reconciliation Design

### Payment vs Ledger Reconciliation

- Cron job runs daily at 2:00 AM
- Compares all payments created in the last 24 hours against their ledger entries
- Detects: missing entries, amount mismatches, duplicate entries
- Results stored in `ReconciliationMatch` with type: MATCHED, DRIFTED, MISSING, DUPLICATE, ORPHAN

### Settlement Batch Matching

- Settlement files (from gateways/banks) imported as `SettlementBatch`
- Each batch item matched against internal payment records
- Tolerances: amount ±$0.01, date window ±48 hours

### Drift Detection and Auto-Correction

```mermaid
flowchart LR
    P[Payment Record] --> C{Compare}
    L[Ledger Entry] --> C
    C -->|Match| DONE[✓ Reconciled]
    C -->|Drift ≤ $0.01| AUTO[Auto-correct]
    C -->|Drift > $0.01| FLAG[Flag for Review]
    AUTO --> DONE
    FLAG --> ESCALATE[Escalate to Ops]
```

- Small drifts (≤$0.01) auto-corrected with adjustment entry
- Larger drifts flagged and escalated via support ticket
- Duplicate entries: reverse one entry automatically

### Daily Reconciliation Cron Job

Runs at 02:00 UTC via `node-cron`. Process:
1. Create `ReconciliationRun` record
2. Query payments from last 24h
3. Query ledger entries for those payments
4. For each payment, compute expected vs actual totals
5. Create `ReconciliationMatch` for each discrepancy
6. Apply auto-corrections for small drifts
7. Update run summary

## Fraud Engine Design

### Rule-Based Scoring System

```mermaid
flowchart LR
    P[Payment] --> R1[Rule 1: Velocity]
    P --> R2[Rule 2: Amount Threshold]
    P --> R3[Rule 3: Country Mismatch]
    P --> R4[Rule 4: Card BIN Risk]
    P --> R5[Rule N...]

    R1 -->|Score 0-30| SUM{Sum Scores}
    R2 -->|Score 0-20| SUM
    R3 -->|Score 0-25| SUM
    R4 -->|Score 0-15| SUM
    R5 -->|Score 0-10| SUM
    SUM -->|Total 0-100| DECIDE{Decision}
```

### Built-in Rules

| Rule | Description | Weight |
|------|-------------|--------|
| Velocity Check | >10 payments in 5 minutes from same customer | 30 |
| Amount Threshold | >$10,000 single transaction | 20 |
| Country Mismatch | Card country ≠ IP country ≠ merchant country | 25 |
| High-Risk BIN | BIN matches known fraudulent pattern | 15 |
| Card Testing | Multiple small declines followed by large attempt | 25 |
| New Customer | Customer created < 1 hour ago | 10 |

### Decision Thresholds

| Score Range | Action |
|-------------|--------|
| 0–49 | **APPROVE** — Payment proceeds normally |
| 50–79 | **REVIEW** — Flag for manual review, hold payment |
| 80–100 | **DECLINE** — Payment rejected automatically |

### Extensibility

- New rules can be added without restart by inserting into the `FraudRule` table
- Rules have configurable `scoreWeight`, `enabled` flag, and `condition` JSON
- Custom logic can be added via the `FraudScorer` class

## Payout Lifecycle

### Settlement Accumulation

Captured payments accumulate in the merchant's settlement pool. Each payment's net amount (amount - fees - reserve) is tracked via `PayoutItem` records.

### Payout Scheduling

- Default: Daily automatic payout
- Manual payouts available via API
- Minimum payout amount: $10 (configurable)
- Payouts batched by currency

### Payout Processing

```mermaid
sequenceDiagram
    participant Cron/Scheduler
    participant PayoutService
    participant Ledger
    participant Bank

    Cron/Scheduler->>PayoutService: Trigger payout cycle
    PayoutService->>PayoutService: Calculate pending amounts
    PayoutService->>PayoutService: Create Payout record
    PayoutService->>Ledger: Create transfer journal entry
    PayoutService->>Bank: Initiate bank transfer
    alt Transfer successful
        Bank-->>PayoutService: Confirmation
        PayoutService->>PayoutService: Mark COMPLETED
        PayoutService->>Ledger: Settlement entry
    else Transfer failed
        Bank-->>PayoutService: Error
        PayoutService->>PayoutService: Mark FAILED
        PayoutService->>PayoutService: Schedule retry
    end
```

### GL Entry Creation

On payout initiation:
```
Debit  Liability:SettlementPayable    $NetAmount
Credit Asset:BankAccount              $NetAmount
```

## Security Model

### Authentication

| Method | Mechanism | Use Case |
|--------|-----------|----------|
| JWT Token | `Authorization: Bearer <jwt>` | Merchant portal sessions |
| API Key | `x-api-key: <key>` | SDK/API programmatic access |
| API Key Format | `nex_live_<64char_hex>` or `nex_test_<64char_hex>` | Key prefix identifies env |

- API keys stored as SHA-256 hash (cannot retrieve raw key after creation)
- JWT tokens expire after 7 days
- Password reset invalidates all existing API keys

### Authorization (RBAC)

- API key scopes: `charges:read`, `charges:write`, `refunds:write`, `disputes:read`, etc.
- JWT tokens have wildcard scope (`*`)
- All routes verify merchant ID ownership

### MFA

| Method | Status |
|--------|--------|
| TOTP (Authenticator App) | ✅ Implemented |
| SMS OTP | ✅ Implemented (simulated) |
| Backup Codes | ✅ 8 codes on setup |

### Rate Limiting

- Per-IP, per-endpoint tracking in PostgreSQL (`RateLimit` model)
- POST endpoints: 100 requests/minute
- GET endpoints: 300 requests/minute
- Burst: 1.5x limit for up to 10 seconds
- Blocked after exceeding limit 3x in rolling window

### Encryption

- Passwords: bcrypt with 12 rounds
- API keys: SHA-256 hash storage
- Webhook secrets: SHA-256 hash storage
- Database: Column-level encryption for PII via Prisma middleware
- In transit: TLS 1.3 (terminated at NGINX)

### Webhook Signature Verification

- HMAC-SHA256 with per-endpoint secret
- Verification via `crypto.timingSafeEqual`
- Rotation supported via `/webhooks/:id/rotate-secret`

## API Design

### RESTful Conventions

- Base URL: `https://api.nexpay.com/v1`
- Resources map to endpoints: `/payments/charges`, `/customers`, `/webhooks`
- Nested resources: `/payments/charges/:id/refund`
- CRUD operations via POST/GET/PATCH/DELETE
- List endpoints support: `?limit=50&offset=0`, `?status=ACTIVE`, `?search=term`

### Authentication Methods

```http
# JWT (Merchant Portal)
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# API Key (Programmatic)
x-api-key: nex_live_a1b2c3d4e5f6...
```

### Idempotency

- Header: `Idempotency-Key: <uuid>`
- Scope: Per-merchant, per-key
- TTL: 24 hours
- Response: Returns original response if key already exists

### Error Format

```json
{
  "error": "insufficient_funds",
  "message": "The card has insufficient funds to complete this transaction",
  "status": 402
}
```

### Pagination

```json
{
  "data": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

## Deployment

### Docker Setup

- **API**: Node.js 20 Alpine, Express server
- **Merchant Portal**: Next.js standalone build, Node.js runtime
- **Admin Portal**: Next.js standalone build, Node.js runtime
- **PostgreSQL 16**: Official image with init scripts
- **Redis 7**: Official Alpine image
- **NGINX**: Reverse proxy, TLS termination, static asset serving

### Docker Compose (Development)

```yaml
services:
  postgres:     # Port 5432
  redis:        # Port 6379
  api:          # Port 3003, depends on postgres+redis
  merchant-ui:  # Port 3000, depends on api
  admin-ui:     # Port 3001, depends on api
```

### Docker Compose (Production)

Adds:
- Environment-specific configuration
- Volume mounts for persistence
- Healthchecks
- Resource limits
- Network isolation

### NGINX Reverse Proxy

```
/api/v1/*     → proxy_pass api:3003
/merchant/*   → proxy_pass merchant-ui:3000
/admin/*      → proxy_pass admin-ui:3000
/             → proxy_pass merchant-ui:3000 (default)
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `NODE_ENV` | Environment (dev/prod) | ✅ |
| `PORT` | API server port | Default: 3003 |
| `STRIPE_SECRET_KEY` | Stripe API secret | For Stripe gateway |
| `RAZORPAY_KEY_ID` | Razorpay key ID | For Razorpay gateway |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | For Razorpay gateway |

### CI/CD Pipeline

- GitHub Actions for CI
- Lint → Typecheck → Test → Build → Docker image → Deploy
- Staging deployment on PR merge to `develop`
- Production deployment on tag push (`v*.*.*`)

## Scaling Strategy

### Horizontal Scaling of API

- Stateless Express API (session state in Redis)
- Multiple API instances behind NGINX round-robin
- Redis for shared cache and rate limit state
- Database connection pooling via Prisma

### Redis Usage

| Purpose | Key Pattern | TTL |
|---------|-------------|-----|
| BullMQ Queues | `bull:webhook-delivery:*` | — |
| Sandbox Chaos State | `sandbox:{merchantId}:*` | 24h |
| Rate Limit Counters | `ratelimit:{ip}:{endpoint}` | 1m |
| Session Cache | `session:{merchantId}` | 7d |

### BullMQ for Background Jobs

| Queue | Worker | Concurrency |
|-------|--------|-------------|
| `webhook-delivery` | HTTP POST to endpoints | 10 |
| `payout-processing` | Generate + send payouts | 2 |
| `outbox-publisher` | Poll outbox + publish events | 5 |

### Database Indexing

- All foreign keys indexed
- Composite indexes on common query patterns
- Partial indexes for filtered queries (`WHERE status = 'PENDING'`)
- `EXPLAIN ANALYZE` used during query optimization

### Read Replicas for Reporting

- Prisma supports read replicas for read-heavy queries
- Analytics and reconciliation queries directed to replicas
- Writes always go to primary

## Tradeoffs and Decisions

### Why Prisma over TypeORM/Drizzle

- **Type safety**: Auto-generated types from schema
- **Migration experience**: Prisma Migrate is mature and reliable
- **Relation queries**: Nested include/select without join boilerplate
- **Tradeoff**: Slightly slower raw query performance vs Drizzle; acceptable for this scale

### Why BullMQ over Bee-Queue

- **Redis-backed**: Shared state across API instances
- **Job scheduling**: Delayed jobs, repeatable jobs
- **Observability**: Built-in job events, progress, and metrics
- **Rate limiting**: Per-worker rate limiting built in
- **Tradeoff**: More Redis memory usage; Bee-Queue would be simpler for single-worker scenarios

### Why PostgreSQL over MySQL

- **JSONB support**: Native JSON operations for metadata, webhook payloads
- **Advanced indexing**: Partial, expression, and GiST indexes
- **CTEs and window functions**: Complex reporting queries
- **Extensions**: `uuid-ossp`, `pgcrypto`, `pg_stat_statements`
- **Tradeoff**: Slightly higher operational complexity; MySQL would be simpler for read-heavy workloads

### Why JWT over Session-Based Auth

- **Stateless**: No session store lookup on each request
- **Self-contained**: Merchant ID and scopes in token payload
- **API-key compatible**: Same middleware handles both auth methods
- **Tradeoff**: Token revocation requires key rotation (mitigated by short TTL)

### Monorepo vs Polyrepo Decision

**Chosen: Monorepo (Turborepo)**

- Shared TypeScript types between API and portals
- Single `npm install`, unified dependency management
- Atomic cross-package changes in one PR
- Turborepo caching for fast CI

**Tradeoff**: Larger repo size, requires discipline in dependency management. Turborepo mitigates with scope-based builds.
