# Failure Modes & Resilience Design

This document describes how NexPay handles failures across the system.

## Payment Processing

### Gateway timeout after capture request
- **Problem**: Gateway responds with timeout but may have captured the payment.
- **Handling**: Idempotency keys prevent duplicate charges on retry. Reconciliation detects unmatched payments vs. ledger entries during daily run.
- **Recovery**: Admin reviews reconciliation issues. Manual correction via ledger adjustment if needed.

### Duplicate payment creation
- **Problem**: Network retry causes double charge.
- **Handling**: Idempotency-Key header. Same key always returns cached result. Lock acquired via Redis to prevent race conditions.
- **Recovery**: Cached response returned automatically. No action needed.

### Fraud false positive (legitimate payment blocked)
- **Problem**: Fraud engine incorrectly blocks valid payment.
- **Handling**: Fraud rules are configurable. Each rule has a score; admin can disable rules.
- **Recovery**: Admin disables problematic rule, merchant re-submits payment. Audit log tracks all rule changes.

## Ledger & Accounting

### Ledger write succeeds but webhook fails
- **Problem**: Money movement recorded but merchant not notified.
- **Handling**: Transactional outbox pattern. Payment creates PENDING outbox event in same DB transaction. Outbox worker retries failed deliveries.
- **Recovery**: Outbox worker retries with exponential backoff. Failed events visible in admin dashboard for replay.

### Ledger imbalance (debit != credit)
- **Problem**: Software bug creates unbalanced entry.
- **Handling**: Every journal entry is validated before posting (`validateBalancedLines` ensures debit === credit). Advisory locks prevent concurrent balance corruption.
- **Recovery**: Daily reconciliation detects drift. Admin creates corrective ledger adjustment with dual-approval.

### Balance drift between Redis and PostgreSQL
- **Problem**: Redis wallet balance diverges from ledger-calculated balance.
- **Handling**: Wallet balance stored in Redis for performance, ledger for source of truth. `getBalance()` calculates from ledger on demand.
- **Recovery**: Reconciliation worker compares Redis vs. ledger balances hourly. Auto-corrects minor drift (< 1 unit). Flags major drift for admin review.

## Async Jobs & Workers

### Worker crashes mid-job
- **Problem**: Worker process terminates during payout processing.
- **Handling**: BullMQ jobs are durable (stored in Redis). Unfinished jobs are picked up by another worker after stall timeout (maxStalledCount: 3).
- **Recovery**: Job automatically retries. Admin monitors stalled jobs via BullMQ dashboard.

### Webhook endpoint down
- **Problem**: Merchant's webhook server returns 5xx or timeout.
- **Handling**: Exponential backoff retry: 1s, 4s, 16s, 64s, 256s. After 5 failures, delivery marked DEAD_LETTER. Request timeout set to 10s.
- **Recovery**: Merchant fixes endpoint. Admin replays dead-letter deliveries via webhook replay feature.

### Cron job missed
- **Problem**: Server restart during scheduled reconciliation.
- **Handling**: node-cron has no built-in persistence. Last run tracked in database.
- **Recovery**: Admin manually triggers reconciliation via admin panel. Cron runs on next schedule if missed.

## Payouts

### Payout fails after balance reserved
- **Problem**: Balance deducted but bank transfer fails.
- **Handling**: Payout has status machine (PENDING → PROCESSING → COMPLETED/FAILED). Balance NOT deducted until payout COMPLETED. On FAILED, payout can be retried.
- **Recovery**: Admin retries failed payout. Bank account details can be corrected before retry.

### Insufficient balance for payout
- **Problem**: Merchant requests payout exceeding available balance.
- **Handling**: `validatePayoutTransition` and balance check prevent over-payout. Balance check uses wallet balance from ledger.
- **Recovery**: Merchant sees "insufficient balance" error in dashboard.

## Reconciliation

### Reconciliation drift detected
- **Problem**: Payment amount doesn't match ledger entry.
- **Handling**: `reconciliation.service.ts` compares all payments against ledger and GL. Drifts categorized as MINOR (<$0.01) or SIGNIFICANT.
- **Recovery**: Minor drifts auto-corrected. Significant drifts escalated for admin review. Resolution via ledger adjustment.

### Settlement file mismatch
- **Problem**: Bank settlement amount differs from platform records.
- **Handling**: Settlement batch import compares each line item against payment records.
- **Recovery**: Mismatches flagged as DRIFTED/OPEN. Admin reviews and resolves.

## Multi-Tenancy

### Cross-tenant data leak
- **Problem**: Merchant A reads Merchant B data.
- **Handling**: Every query scoped by `merchantId`. API key resolves to specific merchant. Middleware attaches merchant context. RBAC enforces role-based access.
- **Recovery**: Audit logs track all data access. Admin can review security events.

### Accidental cross-tenant access in code
- **Problem**: Developer forgets `where: { merchantId }` clause.
- **Prevention**: All repository methods require `merchantId` parameter. Code review checklist includes tenant scoping. Tenant isolation integration tests verify separation.

## Security

### API key leaked
- **Problem**: Merchant's secret API key exposed in client-side code.
- **Handling**: Keys have scopes (read/write/admin). Keys can be rotated immediately. SHA-256 hashed at rest — no plaintext storage.
- **Recovery**: Merchant rotates key in dashboard. Old key immediately invalidated.

### Webhook signature verification fails
- **Problem**: Merchant cannot verify webhook authenticity.
- **Handling**: HMAC-SHA256 with per-endpoint secret. Signing key returned once at creation. Secret can be rotated.
- **Recovery**: Merchant regenerates secret, updates verification code.

## Database

### Connection pool exhaustion
- **Problem**: Too many concurrent requests exhaust pool.
- **Handling**: Pool size 20 (configurable). Rate limiting at API layer. Connection timeout set to 30s.
- **Recovery**: Requests queue automatically. Admin monitors connections in health dashboard.

### Deadlock on concurrent ledger writes
- **Problem**: Two payments try to update same accounts simultaneously.
- **Handling**: Advisory locks acquired in sorted order before balance update. This prevents deadlock by ensuring consistent lock ordering.
- **Recovery**: PostgreSQL retries deadlocked transactions automatically.

## Monitoring & Alerting

### Metrics lost on restart
- **Problem**: In-memory metrics reset on server restart.
- **Handling**: Prometheus metrics endpoint exposes current state. Long-term metrics stored in Grafana. Business metrics calculable from database.
- **Recovery**: No data loss for financial records (stored in PostgreSQL). Only transient counters reset.

### Alert fatigue
- **Problem**: Too many false alarms.
- **Handling**: Integrity dashboard shows aggregate health (not per-item alerts). Thresholds set conservatively (10+ DLQ before alert, 5+ reconciliation issues).
- **Recovery**: Alert thresholds configurable via environment variables.
