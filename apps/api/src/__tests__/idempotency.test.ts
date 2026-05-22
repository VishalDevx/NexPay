import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

const mockPrisma = {
  idempotencyKey: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../config/redis", () => ({ redis: mockRedis }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IdempotencyMiddleware", () => {
  function makeReqRes(overrides = {}) {
    const body = { amount: "100.00", currency: "INR" };
    const req = {
      method: "POST",
      headers: { "idempotency-key": "idemp-key-1" },
      merchant: { id: "merchant-1" },
      body,
      originalUrl: "/api/v1/payments/charge",
      ...overrides,
    } as any;
    const res = {
      statusCode: 200,
      json: vi.fn(function (this: any, data: any) {
        return data;
      }),
      status: vi.fn(function (this: any, code: number) {
        this.statusCode = code;
        return this;
      }),
    } as any;
    return { req, res };
  }

  it("skips non-POST/PATCH methods", async () => {
    const { idempotencyMiddleware } = await import("../middleware/idempotency");
    const { req, res } = makeReqRes({ method: "GET" });
    const next = vi.fn();

    await idempotencyMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("skips when no idempotency key header", async () => {
    const { idempotencyMiddleware } = await import("../middleware/idempotency");
    const { req, res } = makeReqRes({ headers: {} });
    const next = vi.fn();

    await idempotencyMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("skips when no merchant on request", async () => {
    const { idempotencyMiddleware } = await import("../middleware/idempotency");
    const { req, res } = makeReqRes({ merchant: undefined });
    const next = vi.fn();

    await idempotencyMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("returns cached response from Redis", async () => {
    const { idempotencyMiddleware } = await import("../middleware/idempotency");
    const { req, res } = makeReqRes();
    const next = vi.fn();

    const cachedBody = { id: "pay-1", status: "PROCESSING" };
    mockRedis.get.mockResolvedValue(JSON.stringify(cachedBody));

    await idempotencyMiddleware(req, res, next);

    expect(res.json).toHaveBeenCalledWith(cachedBody);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns cached response from Prisma", async () => {
    const { idempotencyMiddleware } = await import("../middleware/idempotency");
    const { req, res } = makeReqRes();
    const next = vi.fn();

    mockRedis.get.mockResolvedValue(null);
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      key: "idemp-key-1",
      response: { id: "pay-1", status: "PROCESSING" },
      expiresAt: new Date(Date.now() + 3600000),
    });

    await idempotencyMiddleware(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ id: "pay-1", status: "PROCESSING" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 409 conflict when lock is held by another request", async () => {
    const { idempotencyMiddleware } = await import("../middleware/idempotency");
    const { req, res } = makeReqRes();
    const next = vi.fn();

    mockRedis.get.mockResolvedValue(null);
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue(null);

    await idempotencyMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("proceeds with next() when no cached response and lock acquired", async () => {
    const { idempotencyMiddleware } = await import("../middleware/idempotency");
    const { req, res } = makeReqRes();
    const next = vi.fn();

    mockRedis.get.mockResolvedValue(null);
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue("OK");

    await idempotencyMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.idempotencyKey).toBe("idemp-key-1");
  });

  it("stores response in Prisma and Redis on successful response", async () => {
    const { idempotencyMiddleware } = await import("../middleware/idempotency");
    const { req, res } = makeReqRes();
    const next = vi.fn();

    mockRedis.get.mockResolvedValue(null);
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue("OK");

    await idempotencyMiddleware(req, res, next);

    const responseBody = { id: "pay-1", status: "CREATED" };
    res.json(responseBody);

    expect(mockPrisma.idempotencyKey.create).toHaveBeenCalled();
    expect(mockRedis.set).toHaveBeenCalled();
  });
});
