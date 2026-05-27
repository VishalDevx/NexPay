# Multi-Tenant Architecture

This document explains how tenant isolation works in NexPay.

## Overview

NexPay is a multi-tenant platform where each merchant is a tenant. All data is scoped to a merchant. Cross-tenant access is prevented at every layer.

## Tenant Identification

Each request is associated with a tenant via one of:

1. **JWT Token**: Contains `merchantId` claim. Set during login.
2. **API Key**: Resolves to a `merchantId` via `prefix` lookup in `api_keys` table.
3. **Admin Session**: Internal users can access all tenants.

Middleware attaches `req.merchant` to every authenticated request:

```
auth.ts → validate JWT or API key → lookup merchant → attach req.merchant
```

## Data Model

Every resource table has a `merchantId` foreign key:

| Table          | Tenant Column | Notes                              |
| -------------- | ------------- | ---------------------------------- |
| payments       | merchantId    | Required, indexed                  |
| customers      | merchantId    | Unique per merchant+email          |
| refunds        | → payment     | Scoped via payment.merchantId      |
| disputes       | merchantId    | Required                           |
| payouts        | merchantId    | Required                           |
| wallets        | merchantId    | Unique per merchant+currency       |
| webhook_endpoints | merchantId    | Required                           |
| api_keys       | merchantId    | Required                           |
| invoices       | merchantId    | Required                           |
| subscriptions  | merchantId    | Required                           |

## Query Scoping

All queries MUST include a `merchantId` filter:

```typescript
// Correct
prisma.payment.findMany({ where: { merchantId: req.merchant.id } });

// INCORRECT - would return cross-tenant data
prisma.payment.findMany();
```

Repository layer enforces this:

```typescript
// payment.repo.ts
async findByMerchant(merchantId: string) {
  return prisma.payment.findMany({ where: { merchantId } });
}
```

## API Key Scopes

Each API key has a comma-separated `scopes` field:

| Scope            | Access                            |
| ---------------- | --------------------------------- |
| `charges:write`  | Create captures                   |
| `charges:read`   | View payment details              |
| `refunds:write`  | Issue refunds                     |
| `customers:read` | View customer data                |
| `webhooks:read`  | View webhook config/deliveries    |
| `admin:*`        | All operations (merchant-level)   |

Scopes are validated in middleware before any write operation.

## Test vs. Live Isolation

Each API key has an `env` field (`TEST` or `LIVE`).

- Test keys create payments in sandbox mode
- Live keys process real payments
- Sandbox middleware prefixes all test payments to prevent cross-contamination

## RBAC

Team members have roles that control access:

| Role      | Access Level                          |
| --------- | ------------------------------------- |
| `OWNER`   | Full access, can manage billing       |
| `ADMIN`   | Full access, can manage team          |
| `DEVELOPER` | API key management, webhook config  |
| `ANALYST` | Read-only reports                     |
| `FINANCE` | Payouts, invoices, refunds            |
| `SUPPORT` | Disputes, customer data               |

Roles are enforced at the API endpoint level via `requireRole()` middleware.

## Admin Access

Internal admin users bypass merchant scoping:

```typescript
function enforceMerchantScope(reqMerchantId: string, resourceMerchantId: string): boolean {
  if (reqMerchantId === "admin") return true;
  return reqMerchantId === resourceMerchantId;
}
```

Admin routes are prefixed with `/api/v1/admin/` and require admin-level API key or session.

## API Key Auth Flow

```
Request → x-api-key header

1. Decode prefix (first 8 chars)
2. Lookup key_hash by prefix in api_keys table
3. SHA-256 hash the full key
4. Compare hashes (timing-safe)
5. Check merchant is active
6. Check key is not revoked
7. Attach merchant + scopes to request
```

## Tenant Isolation Tests

See `apps/api/src/__tests__/tenant-isolation.test.ts` for integration tests that verify:

- Merchant A cannot read Merchant B payments
- Merchant A cannot access Merchant B API keys
- Merchant A webhook events are scoped correctly
- Admin can access all tenants
- API key env (test/live) isolation

## Common Pitfalls

1. **Missing `merchantId` in query**: Always include `where: { merchantId: ... }` in Prisma queries.
2. **Direct table joins without merchant filter**: When joining through related tables (e.g., refund → payment), ensure the payment's merchantId matches.
3. **Caching across tenants**: Redis keys include merchantId prefix (`wallet:{merchantId}:{currency}`) to prevent cross-tenant cache access.
4. **Background jobs**: Workers must receive merchantId in job data, not infer from session.
