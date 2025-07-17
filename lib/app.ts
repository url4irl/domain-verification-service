import express from "express";
import swaggerUi from "swagger-ui-express";
import { DomainVerificationService } from "./service";
import { jsDocSpecs } from "./docs";
import type { Application } from "express";

export function createApp(enableSwagger: boolean = true): Application {
  const app = express();

  const verificationService = new DomainVerificationService();

  app.use(express.json());

  // TODO: Re-enable Swagger documentation after fixing type compatibility
  // Swagger documentation route (only in non-test environments)
  if (enableSwagger) {
    try {
      app.use(
        "/docs",
        swaggerUi.serve as any,
        swaggerUi.setup(jsDocSpecs) as any
      );
    } catch (error) {
      console.warn("Failed to setup Swagger UI:", error);
    }
  }

  app.get("/", async (_, res) => {
    // Test connection with database
    try {
      await verificationService.testDbConnection();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Failed to connect to the database",
      });
    }

    res.json({
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

  // Register or update a domain configuration
  app.post("/api/domains/push", async (req, res) => {
    const { domain, ip, customerId } = req.body;

    if (!domain || !ip) {
      return res.status(400).json({
        success: false,
        error: `"domain" and "ip" address are required`,
      });
    }

    try {
      const domainRecord = await verificationService.registerDomain(
        domain,
        ip,
        customerId
      );

      res.json({
        success: true,
        message: "Domain registered successfully",
        domain: {
          id: domainRecord.id,
          name: domainRecord.name,
          ip: domainRecord.ip,
          customerId: domainRecord.customerId,
          isVerified: domainRecord.isVerified,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: (error as any)?.message,
      });
    }
  });

  app.post("/api/domains/verify", async (req, res) => {
    const { domain, customerId, serviceHost, txtRecordVerifyKey } = req.body;

    if (!domain || !customerId || !serviceHost || !txtRecordVerifyKey) {
      return res.status(400).json({
        success: false,
        error: `"domain", "customerId", "serviceHost", and "txtRecordVerifyKey" are required`,
      });
    }

    try {
      const token = await verificationService.generateVerificationToken(
        domain,
        customerId
      );
      const instructions =
        await verificationService.getVerificationInstructions(
          domain,
          serviceHost,
          customerId,
          txtRecordVerifyKey
        );

      res.json({
        success: true,
        token,
        instructions,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: (error as any)?.message,
      });
    }
  });

  // Check verification status
  app.post("/api/domains/check", async (req, res) => {
    const { domain, customerId, serviceHost, txtRecordVerifyKey } = req.body;

    if (!domain || !customerId || !serviceHost || !txtRecordVerifyKey) {
      return res.status(400).json({
        success: false,
        error: `"domain", "customerId", "serviceHost", and "txtRecordVerifyKey" are required`,
      });
    }

    try {
      const isVerified = await verificationService.completeDomainVerification(
        domain,
        serviceHost,
        customerId,
        txtRecordVerifyKey
      );

      if (isVerified) {
        res.json({
          success: true,
          message: "Domain verified successfully",
          domain,
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: (error as any)?.message,
      });
    }
  });

  // Get domain status
  app.get("/api/domains/status", async (req, res) => {
    const { domain, customerId } = req.query;

    if (!domain || !customerId) {
      return res.status(400).json({
        success: false,
        error: `"domain" and "customerId" query parameters are required`,
      });
    }

    try {
      const status = await verificationService.getDomainStatus(
        domain as string,
        customerId as string
      );

      return res.json({
        success: true,
        status,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: (error as any)?.message,
      });
    }
  });

  return app;
}
