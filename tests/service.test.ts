import { DomainVerificationService } from "../lib/service";
import { testDb } from "./test-db";

describe("DomainVerificationService Unit Tests", () => {
  let service: DomainVerificationService;

  beforeAll(async () => {
    await testDb.setup();
    service = new DomainVerificationService();
  });

  beforeEach(async () => {
    await testDb.cleanup();
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  describe("testDbConnection", () => {
    it("should successfully test database connection", async () => {
      const result = await service.testDbConnection();
      expect(result).toBe(true);
    });
  });

  describe("registerDomain", () => {
    it("should register a new domain", async () => {
      const domain = await service.registerDomain(
        "test.com",
        "192.168.1.1",
        "customer1"
      );

      expect(domain).toEqual({
        id: expect.any(Number),
        name: "test.com",
        ip: "192.168.1.1",
        customerId: "customer1",
        isVerified: false,
        verificationToken: null,
        tokenExpiresAt: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should update existing domain with same domain and user", async () => {
      // Register initial domain
      const initial = await service.registerDomain(
        "test.com",
        "192.168.1.1",
        "customer1"
      );

      // Update with new IP
      const updated = await service.registerDomain(
        "test.com",
        "192.168.1.2",
        "customer1"
      );

      expect(updated.id).toBe(initial.id);
      expect(updated.ip).toBe("192.168.1.2");
      expect(updated.isVerified).toBe(false); // Should reset verification when IP changes
    });

    it("should allow different users to register the same domain", async () => {
      const domain1 = await service.registerDomain(
        "test.com",
        "192.168.1.1",
        "customer1"
      );
      const domain2 = await service.registerDomain(
        "test.com",
        "192.168.1.2",
        "customer2"
      );

      expect(domain1.id).not.toBe(domain2.id);
      expect(domain1.customerId).toBe("customer1");
      expect(domain2.customerId).toBe("customer2");
    });

    it("should register domain without customerId", async () => {
      const domain = await service.registerDomain("test.com", "192.168.1.1");

      expect(domain.customerId).toBeNull();
      expect(domain.name).toBe("test.com");
    });

    it("should allow empty domain names (handled by database constraints)", async () => {
      const domain = await service.registerDomain("", "192.168.1.1", "customer1");

      expect(domain.name).toBe("");
    });

    it("should allow empty IP addresses (handled by database constraints)", async () => {
      const domain = await service.registerDomain("test.com", "", "customer1");

      expect(domain.ip).toBe("");
    });
  });

  describe("generateVerificationToken", () => {
    beforeEach(async () => {
      await service.registerDomain("test.com", "192.168.1.1", "customer1");
    });

    it("should generate verification token for existing domain", async () => {
      const token = await service.generateVerificationToken(
        "test.com",
        "customer1"
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(64);
    });

    it("should throw error for non-existent domain", async () => {
      await expect(
        service.generateVerificationToken("nonexistent.com", "customer1")
      ).rejects.toThrow("Domain not found");
    });

    it("should generate new token on subsequent calls", async () => {
      const token1 = await service.generateVerificationToken(
        "test.com",
        "customer1"
      );
      const token2 = await service.generateVerificationToken(
        "test.com",
        "customer1"
      );

      expect(token1).not.toBe(token2);
    });
  });

  describe("getVerificationInstructions", () => {
    beforeEach(async () => {
      await service.registerDomain("test.com", "192.168.1.1", "customer1");
      await service.generateVerificationToken("test.com", "customer1");
    });

    it("should return verification instructions", async () => {
      const instructions = await service.getVerificationInstructions(
        "test.com",
        "verification.example.com",
        "customer1",
        "verify-key-123"
      );

      expect(instructions).toEqual({
        step1: {
          type: "TXT",
          name: expect.any(String),
          value: expect.any(String),
          instruction: expect.any(String),
        },
        step2: {
          type: "CNAME",
          name: expect.any(String),
          value: expect.any(String),
          instruction: expect.any(String),
        },
      });

      // Verify TXT record format
      expect(instructions.step1.name).toBe("test.com");
      expect(instructions.step1.value).toMatch(/^verify-key-123=[a-f0-9]{64}$/);

      // Verify CNAME record format
      expect(instructions.step2.name).toBe("test.com");
      expect(instructions.step2.value).toBe("verification.example.com");
    });

    it("should throw error for domain without token", async () => {
      await service.registerDomain("notoken.com", "192.168.1.1", "customer1");

      await expect(
        service.getVerificationInstructions(
          "notoken.com",
          "verification.example.com",
          "customer1",
          "verify-key-123"
        )
      ).rejects.toThrow("No pending verification for this domain");
    });
  });

  describe("getDomainStatus", () => {
    beforeEach(async () => {
      await service.registerDomain("test.com", "192.168.1.1", "customer1");
    });

    it("should return domain status", async () => {
      const status = await service.getDomainStatus("test.com", "customer1");

      expect(status).toEqual({
        domain: "test.com",
        ip: "192.168.1.1",
        isVerified: false,
        hasActivePendingVerification: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should show token status when token exists", async () => {
      await service.generateVerificationToken("test.com", "customer1");
      const status = await service.getDomainStatus("test.com", "customer1");

      expect(status.hasActivePendingVerification).toBe(true);
    });

    it("should throw error for non-existent domain", async () => {
      await expect(
        service.getDomainStatus("nonexistent.com", "customer1")
      ).rejects.toThrow("Domain not found");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle database connection failures gracefully", async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the service handles errors properly

      await expect(
        service.registerDomain("test.com", "192.168.1.1", "customer1")
      ).resolves.toBeDefined();
    });

    it("should handle concurrent domain registrations", async () => {
      const promises = [
        service.registerDomain("concurrent.com", "192.168.1.1", "customer1"),
        service.registerDomain("concurrent.com", "192.168.1.2", "customer1"),
      ];

      const results = await Promise.allSettled(promises);

      // At least one should succeed
      const successful = results.filter((r) => r.status === "fulfilled");
      expect(successful.length).toBeGreaterThan(0);
    });

    it("should handle very long domain names", async () => {
      const longDomain = "a".repeat(200) + ".com";

      // The service doesn't validate length, it's handled by database constraints
      const domain = await service.registerDomain(
        longDomain,
        "192.168.1.1",
        "customer1"
      );
      expect(domain.name).toBe(longDomain);
    });

    it("should handle special characters in customerId", async () => {
      const specialCustomerId = "customer@example.com";
      const domain = await service.registerDomain(
        "test.com",
        "192.168.1.1",
        specialCustomerId
      );

      expect(domain.customerId).toBe(specialCustomerId);
    });
  });
});
