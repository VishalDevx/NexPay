import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  incrbyfloat: vi.fn(),
  decrbyfloat: vi.fn(),
};

const mockPrisma = {
  wallet: { findUnique: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn() },
  walletTxn: { create: vi.fn(), findFirst: vi.fn() },
  $transaction: vi.fn((cb: any) => cb(mockTx)),
};

const mockTx = {
  walletTxn: { create: vi.fn() },
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../config/redis", () => ({ redis: mockRedis }));

beforeEach(() => vi.clearAllMocks());

describe("WalletService", () => {
  async function getWalletService() {
    return (await import("../modules/wallets/wallets.service")).walletService;
  }

  describe("getOrCreateWallet", () => {
    it("returns existing wallet if found", async () => {
      const walletService = await getWalletService();
      const existingWallet = { id: "wallet-1", merchantId: "m1", currency: "INR", redisBalanceKey: "wallet:m1:INR" };
      mockPrisma.wallet.findUnique.mockResolvedValue(existingWallet);

      const result = await walletService.getOrCreateWallet("m1", "INR");
      expect(result).toEqual(existingWallet);
      expect(mockPrisma.wallet.create).not.toHaveBeenCalled();
    });

    it("creates new wallet if not found", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.create.mockResolvedValue({ id: "wallet-new", merchantId: "m1", currency: "INR", redisBalanceKey: "wallet:m1:INR" });
      mockRedis.set.mockResolvedValue("OK");

      const result = await walletService.getOrCreateWallet("m1", "INR");
      expect(result.id).toBe("wallet-new");
      expect(mockRedis.set).toHaveBeenCalledWith("wallet:m1:INR", "0");
    });

    it("creates wallet with different currencies independently", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique
        .mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockPrisma.wallet.create
        .mockResolvedValueOnce({ id: "wallet-inr", merchantId: "m1", currency: "INR", redisBalanceKey: "wallet:m1:INR" })
        .mockResolvedValueOnce({ id: "wallet-usd", merchantId: "m1", currency: "USD", redisBalanceKey: "wallet:m1:USD" });

      const inrWallet = await walletService.getOrCreateWallet("m1", "INR");
      const usdWallet = await walletService.getOrCreateWallet("m1", "USD");
      expect(inrWallet.id).toBe("wallet-inr");
      expect(usdWallet.id).toBe("wallet-usd");
    });
  });

  describe("getBalance", () => {
    it("returns balance from Redis", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockRedis.get.mockResolvedValue("1500.5000");

      const balance = await walletService.getBalance("wallet-1");
      expect(balance).toBe("1500.5000");
    });

    it("returns zero when no Redis balance", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockRedis.get.mockResolvedValue(null);

      const balance = await walletService.getBalance("wallet-1");
      expect(balance).toBe("0");
    });
  });

  describe("load", () => {
    it("loads positive amount to wallet", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockTx.walletTxn.create.mockResolvedValue({ id: "txn-1", type: "LOAD", amount: "500.0000" });
      mockRedis.incrbyfloat.mockResolvedValue("500.0000");

      const result = await walletService.load("m1", "INR", "500.0000");
      expect(result.type).toBe("LOAD");
      expect(result.amount).toBe("500.0000");
      expect(mockRedis.incrbyfloat).toHaveBeenCalledWith("wallet:m1:INR", "500.0000");
    });

    it("throws when loading negative amount", async () => {
      const walletService = await getWalletService();
      await expect(walletService.load("m1", "INR", "-100.0000")).rejects.toThrow("Cannot load negative amount");
    });

    it("creates wallet txn with correct refType", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockTx.walletTxn.create.mockResolvedValue({ id: "txn-1", type: "LOAD", amount: "200.0000" });

      await walletService.load("m1", "INR", "200.0000");
      expect(mockTx.walletTxn.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: "LOAD", refType: "manual_load" }),
      }));
    });
  });

  describe("withdraw", () => {
    it("withdraws positive amount when balance sufficient", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockRedis.get.mockResolvedValue("1000.0000");
      mockTx.walletTxn.create.mockResolvedValue({ id: "txn-2", type: "WITHDRAW", amount: "-300.0000" });

      const result = await walletService.withdraw("m1", "INR", "300.0000");
      expect(result.type).toBe("WITHDRAW");
      expect(mockRedis.decrbyfloat).toHaveBeenCalledWith("wallet:m1:INR", "300.0000");
    });

    it("throws when balance is insufficient", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockRedis.get.mockResolvedValue("100.0000");

      await expect(walletService.withdraw("m1", "INR", "500.0000")).rejects.toThrow("Insufficient wallet balance");
    });

    it("throws when withdrawing negative amount", async () => {
      const walletService = await getWalletService();
      await expect(walletService.withdraw("m1", "INR", "-100.0000")).rejects.toThrow("Cannot withdraw negative amount");
    });

    it("allows withdrawing exact balance", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockRedis.get.mockResolvedValue("500.0000");
      mockTx.walletTxn.create.mockResolvedValue({ id: "txn-3", type: "WITHDRAW", amount: "-500.0000" });

      await walletService.withdraw("m1", "INR", "500.0000");
      expect(mockRedis.decrbyfloat).toHaveBeenCalledWith("wallet:m1:INR", "500.0000");
    });

    it("cannot withdraw when balance is zero", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockRedis.get.mockResolvedValue("0");

      await expect(walletService.withdraw("m1", "INR", "1.0000")).rejects.toThrow("Insufficient wallet balance");
    });
  });

  describe("Balance invariants", () => {
    it("load increases balance by exact amount", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockRedis.get.mockResolvedValue("1000.0000");
      mockRedis.incrbyfloat.mockResolvedValue("1500.0000");
      mockTx.walletTxn.create.mockResolvedValue({ id: "txn-4", type: "LOAD", amount: "500.0000" });

      const initial = await walletService.getBalance("wallet-1");
      expect(initial).toBe("1000.0000");
      await walletService.load("m1", "INR", "500.0000");
      expect(mockRedis.incrbyfloat).toHaveBeenCalledWith("wallet:m1:INR", "500.0000");
    });

    it("withdraw decreases balance by exact amount", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockRedis.get.mockResolvedValue("1000.0000");
      mockTx.walletTxn.create.mockResolvedValue({ id: "txn-5", type: "WITHDRAW", amount: "-200.0000" });

      await walletService.withdraw("m1", "INR", "200.0000");
      expect(mockRedis.decrbyfloat).toHaveBeenCalledWith("wallet:m1:INR", "200.0000");
    });

    it("balance cannot go negative after withdraw", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockRedis.get.mockResolvedValue("100.0000");

      await expect(walletService.withdraw("m1", "INR", "200.0000")).rejects.toThrow("Insufficient wallet balance");
    });

    it("sequential loads and withdraws maintain correct balance", async () => {
      const walletService = await getWalletService();
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: "wallet-1", redisBalanceKey: "wallet:m1:INR" });
      mockTx.walletTxn.create.mockResolvedValue({ id: "txn-6", type: "LOAD", amount: "1000.0000" });

      await walletService.load("m1", "INR", "1000.0000");
      expect(mockRedis.incrbyfloat).toHaveBeenCalledWith("wallet:m1:INR", "1000.0000");

      mockRedis.get.mockResolvedValue("1000.0000");
      mockTx.walletTxn.create.mockResolvedValue({ id: "txn-7", type: "WITHDRAW", amount: "-300.0000" });
      await walletService.withdraw("m1", "INR", "300.0000");
      expect(mockRedis.decrbyfloat).toHaveBeenCalledWith("wallet:m1:INR", "300.0000");

      mockRedis.get.mockResolvedValue("700.0000");
      mockTx.walletTxn.create.mockResolvedValue({ id: "txn-8", type: "WITHDRAW", amount: "-700.0000" });
      await walletService.withdraw("m1", "INR", "700.0000");
      expect(mockRedis.decrbyfloat).toHaveBeenCalledWith("wallet:m1:INR", "700.0000");
    });
  });

  describe("Multi-currency wallet isolation", () => {
    it("INR and USD wallets have independent balances", async () => {
      const walletService = await getWalletService();

      mockPrisma.wallet.findUnique
        .mockResolvedValueOnce({ id: "wallet-inr", redisBalanceKey: "wallet:m1:INR" })
        .mockResolvedValueOnce({ id: "wallet-usd", redisBalanceKey: "wallet:m1:USD" });
      mockRedis.get
        .mockResolvedValueOnce("5000.0000")
        .mockResolvedValueOnce("100.0000");

      const inrBalance = await walletService.getBalance("wallet-inr");
      const usdBalance = await walletService.getBalance("wallet-usd");
      expect(inrBalance).toBe("5000.0000");
      expect(usdBalance).toBe("100.0000");
    });
  });
});
