import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
};

vi.mock("../config/redis", () => ({ redis: mockRedis }));
vi.mock("../config/env", () => ({
  env: { REDIS_URL: "redis://localhost:6379" },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RateLimitMiddleware", () => {
  function makeReqRes(overrides = {}) {
    const req = {
      ip: "192.168.1.1",
      socket: { remoteAddress: "192.168.1.1" },
      merchant: null,
      ...overrides,
    } as any;
    const res = {
      statusCode: 200,
      setHeader: vi.fn(),
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

  it("allows request under limit", async () => {
    const { rateLimitMiddleware } = await import("../middleware/rate-limit");
    const { req, res } = makeReqRes();
    const next = vi.fn();

    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockResolvedValue(5);
    mockRedis.expire.mockResolvedValue(true);

    await rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 95);
  });

  it("blocks request over limit", async () => {
    const { rateLimitMiddleware } = await import("../middleware/rate-limit");
    const { req, res } = makeReqRes();
    const next = vi.fn();

    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockResolvedValue(101);
    mockRedis.expire.mockResolvedValue(true);

    await rateLimitMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns blocked response when IP is blocked", async () => {
    const { rateLimitMiddleware } = await import("../middleware/rate-limit");
    const { req, res } = makeReqRes();
    const next = vi.fn();

    mockRedis.get.mockResolvedValue("1");
    mockRedis.ttl.mockResolvedValue(1800);

    await rateLimitMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "rate_limited" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("different IPs have independent rate limits", async () => {
    const { rateLimitMiddleware } = await import("../middleware/rate-limit");

    const req1 = makeReqRes({ ip: "10.0.0.1" }).req;
    const req2 = makeReqRes({ ip: "10.0.0.2" }).req;
    const res1 = makeReqRes().res;
    const res2 = makeReqRes().res;
    const next1 = vi.fn();
    const next2 = vi.fn();

    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockResolvedValueOnce(5).mockResolvedValueOnce(95);
    mockRedis.expire.mockResolvedValue(true);

    await rateLimitMiddleware(req1, res1, next1);
    await rateLimitMiddleware(req2, res2, next2);

    expect(next1).toHaveBeenCalled();
    expect(next2).toHaveBeenCalled();
  });

  it("authenticated merchants use merchant ID rate limit key", async () => {
    const { rateLimitMiddleware } = await import("../middleware/rate-limit");
    const { req, res } = makeReqRes({ merchant: { id: "merchant-1" } });
    const next = vi.fn();

    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockResolvedValue(2);
    mockRedis.expire.mockResolvedValue(true);

    await rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("sets rate limit headers", async () => {
    const { rateLimitMiddleware } = await import("../middleware/rate-limit");
    const { req, res } = makeReqRes();
    const next = vi.fn();

    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(true);

    await rateLimitMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 100);
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 99);
  });
});

describe("trackAuthFailure", () => {
  it("increments auth failure count and blocks after threshold", async () => {
    const { trackAuthFailure } = await import("../middleware/rate-limit");

    mockRedis.incr.mockResolvedValue(10);
    mockRedis.expire.mockResolvedValue(true);

    await trackAuthFailure("192.168.1.100");

    expect(mockRedis.set).toHaveBeenCalledWith(
      "blocked:192.168.1.100",
      "1",
      "EX",
      expect.any(Number)
    );
  });

  it("does not block before reaching threshold", async () => {
    const { trackAuthFailure } = await import("../middleware/rate-limit");

    mockRedis.incr.mockResolvedValue(3);
    mockRedis.expire.mockResolvedValue(true);

    await trackAuthFailure("192.168.1.101");

    expect(mockRedis.set).not.toHaveBeenCalled();
  });
});
