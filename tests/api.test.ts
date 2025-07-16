import request from "supertest";
import { createApp } from "../lib/app";
import { testDb } from "./test-db";

describe("Domain Verification Service E2E Tests", () => {
  let app: any;

  beforeAll(async () => {
    // Setup test database
    await testDb.setup();
    app = createApp();
  });

  beforeEach(async () => {
    // Clean database before each test
    await testDb.cleanup();
  });

  afterAll(async () => {
    // Teardown test database
    await testDb.teardown();
  });

  describe("GET /", () => {
    it("should return service information and test database connection", async () => {
      const response = await request(app).get("/").expect(200);

      expect(response.body).toEqual({
        message: "Domain Verification Service is running",
        documentation: "http://localhost:4000/docs",
        apiInfo: {
          note: "This SaaS service requires 'serviceHost' and 'txtRecordVerifyKey' parameters in API requests",
          endpoints: {
            verify:
              "POST /api/domains/verify - requires: domain, customerId, serviceHost, txtRecordVerifyKey",
            check:
              "POST /api/domains/check - requires: domain, customerId, serviceHost, txtRecordVerifyKey",
          },
        },
      });
    });
  });

  describe("POST /api/domains/push", () => {
    it("should register a new domain successfully", async () => {
      const domainData = {
        domain: "example.com",
        ip: "192.168.1.1",
        customerId: "customer123",
      };

      const response = await request(app)
        .post("/api/domains/push")
        .send(domainData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Domain registered successfully",
        domain: {
          id: expect.any(Number),
          name: "example.com",
          ip: "192.168.1.1",
          customerId: "customer123",
          isVerified: false,
        },
      });
    });

    it("should update existing domain when registering with same domain and user", async () => {
      const domainData = {
        domain: "example.com",
        ip: "192.168.1.1",
        customerId: "customer123",
      };

      // Register domain first time
      await request(app).post("/api/domains/push").send(domainData).expect(200);

      // Register again with different IP
      const updatedData = {
        ...domainData,
        ip: "192.168.1.2",
      };

      const response = await request(app)
        .post("/api/domains/push")
        .send(updatedData)
        .expect(200);

      expect(response.body.domain.ip).toBe("192.168.1.2");
      expect(response.body.domain.isVerified).toBe(false); // Should reset verification status
    });

    it("should return 400 when domain is missing", async () => {
      const response = await request(app)
        .post("/api/domains/push")
        .send({ ip: "192.168.1.1", customerId: "customer123" })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: '"domain" and "ip" address are required',
      });
    });

    it("should return 400 when ip is missing", async () => {
      const response = await request(app)
        .post("/api/domains/push")
        .send({ domain: "example.com", customerId: "customer123" })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: '"domain" and "ip" address are required',
      });
    });

    it("should register domain without customerId", async () => {
      const domainData = {
        domain: "example.com",
        ip: "192.168.1.1",
      };

      const response = await request(app)
        .post("/api/domains/push")
        .send(domainData)
        .expect(200);

      expect(response.body.domain.customerId).toBeNull();
    });
  });

  describe("POST /api/domains/verify", () => {
    beforeEach(async () => {
      // Register a domain before verification tests
      await request(app).post("/api/domains/push").send({
        domain: "example.com",
        ip: "192.168.1.1",
        customerId: "customer123",
      });
    });

    it("should generate verification token and instructions", async () => {
      const verifyData = {
        domain: "example.com",
        customerId: "customer123",
        serviceHost: "verification.example.com",
        txtRecordVerifyKey: "verify123",
      };

      const response = await request(app)
        .post("/api/domains/verify")
        .send(verifyData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        token: expect.any(String),
        instructions: expect.objectContaining({
          step1: expect.objectContaining({
            type: "TXT",
            name: expect.any(String),
            value: expect.any(String),
            instruction: expect.any(String),
          }),
          step2: expect.objectContaining({
            type: "CNAME",
            name: expect.any(String),
            value: expect.any(String),
            instruction: expect.any(String),
          }),
        }),
      });

      // Verify token is 64 characters long (as per schema)
      expect(response.body.token.length).toBe(64);
    });

    it("should return 400 when required fields are missing", async () => {
      const testCases = [
        {
          customerId: "customer123",
          serviceHost: "verification.example.com",
          txtRecordVerifyKey: "verify123",
        },
        {
          domain: "example.com",
          serviceHost: "verification.example.com",
          txtRecordVerifyKey: "verify123",
        },
        {
          domain: "example.com",
          customerId: "customer123",
          txtRecordVerifyKey: "verify123",
        },
        {
          domain: "example.com",
          customerId: "customer123",
          serviceHost: "verification.example.com",
        },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post("/api/domains/verify")
          .send(testCase)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error:
            '"domain", "customerId", "serviceHost", and "txtRecordVerifyKey" are required',
        });
      }
    });
  });

  describe("POST /api/domains/check", () => {
    beforeEach(async () => {
      // Register a domain and generate verification token
      await request(app).post("/api/domains/push").send({
        domain: "example.com",
        ip: "192.168.1.1",
        customerId: "customer123",
      });

      await request(app).post("/api/domains/verify").send({
        domain: "example.com",
        customerId: "customer123",
        serviceHost: "verification.example.com",
        txtRecordVerifyKey: "verify123",
      });
    });

    it("should return 400 when required fields are missing", async () => {
      const testCases = [
        {
          customerId: "customer123",
          serviceHost: "verification.example.com",
          txtRecordVerifyKey: "verify123",
        },
        {
          domain: "example.com",
          serviceHost: "verification.example.com",
          txtRecordVerifyKey: "verify123",
        },
        {
          domain: "example.com",
          customerId: "customer123",
          txtRecordVerifyKey: "verify123",
        },
        {
          domain: "example.com",
          customerId: "customer123",
          serviceHost: "verification.example.com",
        },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post("/api/domains/check")
          .send(testCase)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error:
            '"domain", "customerId", "serviceHost", and "txtRecordVerifyKey" are required',
        });
      }
    });

    it("should handle verification check (will fail DNS lookup in test environment)", async () => {
      const checkData = {
        domain: "example.com",
        customerId: "customer123",
        serviceHost: "verification.example.com",
        txtRecordVerifyKey: "verify123",
      };

      // In test environment, DNS lookup will fail, so we expect an error
      const response = await request(app)
        .post("/api/domains/check")
        .send(checkData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("GET /api/domains/status", () => {
    beforeEach(async () => {
      // Register a domain
      await request(app).post("/api/domains/push").send({
        domain: "example.com",
        ip: "192.168.1.1",
        customerId: "customer123",
      });
    });

    it("should return domain status", async () => {
      const response = await request(app)
        .get("/api/domains/status")
        .query({ domain: "example.com", customerId: "customer123" })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        status: expect.objectContaining({
          domain: "example.com",
          isVerified: false,
          ip: "192.168.1.1",
          hasActivePendingVerification: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      });
    });

    it("should return 400 when domain query parameter is missing", async () => {
      const response = await request(app)
        .get("/api/domains/status")
        .query({ customerId: "customer123" })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: '"domain" and "customerId" query parameters are required',
      });
    });

    it("should return 400 when customerId query parameter is missing", async () => {
      const response = await request(app)
        .get("/api/domains/status")
        .query({ domain: "example.com" })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: '"domain" and "customerId" query parameters are required',
      });
    });

    it("should return 404 when domain is not found", async () => {
      const response = await request(app)
        .get("/api/domains/status")
        .query({ domain: "nonexistent.com", customerId: "customer123" })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("Integration Flow", () => {
    it("should complete full domain registration and verification flow", async () => {
      const domain = "integration-test.com";
      const customerId = "integration-customer";
      const ip = "10.0.0.1";

      // Step 1: Register domain
      const registerResponse = await request(app)
        .post("/api/domains/push")
        .send({ domain, ip, customerId })
        .expect(200);

      expect(registerResponse.body.success).toBe(true);
      const domainId = registerResponse.body.domain.id;

      // Step 2: Get verification instructions
      const verifyResponse = await request(app)
        .post("/api/domains/verify")
        .send({
          domain,
          customerId,
          serviceHost: "verify.example.com",
          txtRecordVerifyKey: "key123",
        })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.token).toBeDefined();

      // Step 3: Check domain status
      const statusResponse = await request(app)
        .get("/api/domains/status")
        .query({ domain, customerId })
        .expect(200);

      expect(statusResponse.body.status.domain).toBe(domain);
      expect(statusResponse.body.status.isVerified).toBe(false);

      // Step 4: Update domain with new IP
      const updateResponse = await request(app)
        .post("/api/domains/push")
        .send({ domain, ip: "10.0.0.2", customerId })
        .expect(200);

      expect(updateResponse.body.domain.ip).toBe("10.0.0.2");
      expect(updateResponse.body.domain.id).toBe(domainId); // Same domain, updated
    });
  });
});
