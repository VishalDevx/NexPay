import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const mockPrisma = {
  apiKey: { findUnique: vi.fn() },
  merchant: { findUnique: vi.fn() },
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../config/env", () => ({
  env: {
    JWT_SECRET: "test-jwt-secret-key-minimum-16-chars",
  },
}));

const SECRET = "test-jwt-secret-key-minimum-16-chars";

describe("AuthModule", () => {
  describe("Password Hashing", () => {
    it("hashes a password with bcrypt", async () => {
      const bcrypt = await import("bcryptjs");
      const password = "my-secure-password-123";
      const hash = await bcrypt.hash(password, 10);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2a$")).toBe(true);
    });

    it("verifies correct password against hash", async () => {
      const bcrypt = await import("bcryptjs");
      const password = "test-password";
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it("rejects incorrect password against hash", async () => {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash("correct-password", 10);
      const isValid = await bcrypt.compare("wrong-password", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("JWT Token", () => {
    it("generates a JWT token with merchantId claim", () => {
      const token = jwt.sign({ merchantId: "merchant-1" }, SECRET, { expiresIn: "1h" });
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });

    it("verifies a valid JWT token", () => {
      const token = jwt.sign({ merchantId: "merchant-1" }, SECRET, { expiresIn: "1h" });
      const decoded = jwt.verify(token, SECRET) as any;
      expect(decoded.merchantId).toBe("merchant-1");
    });

    it("rejects an expired JWT token", () => {
      const token = jwt.sign({ merchantId: "merchant-1" }, SECRET, { expiresIn: "0s" });
      expect(() => jwt.verify(token, SECRET)).toThrow("expired");
    });

    it("rejects a token with wrong secret", () => {
      const token = jwt.sign({ merchantId: "merchant-1" }, "wrong-secret", { expiresIn: "1h" });
      expect(() => jwt.verify(token, SECRET)).toThrow("invalid signature");
    });

    it("rejects a malformed token", () => {
      expect(() => jwt.verify("not-a-jwt-token", SECRET)).toThrow();
    });
  });

  describe("API Key Auth", () => {
    it("hashes API key with SHA256 for storage", () => {
      const apiKey = "nex_live_abc123def456";
      const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it("rejects revoked API key", async () => {
      const { authMiddleware } = await import("../middleware/auth");

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        keyHash: "hash",
        revokedAt: new Date(),
        merchant: { status: "ACTIVE" },
      });

      const req = { headers: { "x-api-key": "nex_revoked_key" } } as any;
      const res = { status: vi.fn(() => res), json: vi.fn() } as any;
      const next = vi.fn();

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "invalid_api_key" })
      );
    });

    it("rejects inactive merchant", async () => {
      const { authMiddleware } = await import("../middleware/auth");

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        keyHash: "hash",
        revokedAt: null,
        merchant: { status: "SUSPENDED" },
      });

      const req = { headers: { "x-api-key": "nex_suspended_key" } } as any;
      const res = { status: vi.fn(() => res), json: vi.fn() } as any;
      const next = vi.fn();

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("TOTP / MFA", () => {
    it("generates a TOTP secret", () => {
      const secret = crypto.randomBytes(20).toString("hex");
      expect(secret).toBeDefined();
      expect(secret.length).toBe(40);
    });

    it("generates backup codes", () => {
      const codes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 8)
      );
      expect(codes).toHaveLength(8);
      codes.forEach((code) => expect(code.length).toBe(8));
    });
  });

  describe("Password Reset Token", () => {
    it("generates a password reset token with expiry", () => {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000);
      expect(resetToken.length).toBe(64);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
