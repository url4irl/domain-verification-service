import dns from "dns/promises";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "./db/db";
import { domainsTable, verificationLogsTable } from "./db/schema";

export class DomainVerificationService {
  constructor() {}

  async testDbConnection() {
    try {
      await db.select().from(domainsTable).limit(1);
      return true;
    } catch (error) {
      throw new Error(`Database connection failed: ${(error as any)?.message}`);
    }
  }

  /**
   * Register or update a domain configuration
   */
  async registerDomain(domain: string, ip: string, customerId?: string) {
    try {
      // Check if domain already exists for this user
      const existing = customerId
        ? await db
            .select()
            .from(domainsTable)
            .where(
              and(
                eq(domainsTable.name, domain),
                eq(domainsTable.customerId, customerId)
              )
            )
            .limit(1)
        : await db
            .select()
            .from(domainsTable)
            .where(eq(domainsTable.name, domain))
            .limit(1);

      if (existing.length > 0) {
        // Update existing domain
        const [updated] = await db
          .update(domainsTable)
          .set({
            ip,
            updatedAt: new Date(),
            // Reset verification status when IP changes
            isVerified: existing[0].ip === ip ? existing[0].isVerified : false,
          })
          .where(eq(domainsTable.id, existing[0].id))
          .returning();

        return updated;
      } else {
        // Create new domain
        const [created] = await db
          .insert(domainsTable)
          .values({
            name: domain,
            ip,
            customerId,
            isVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return created;
      }
    } catch (error) {
      throw new Error(`Failed to register domain: ${(error as any)?.message}`);
    }
  }

  /**
   * Generate verification token for domain
   */
  async generateVerificationToken(domain: string, customerId: string) {
    try {
      // Get the domain record
      const [domainRecord] = await db
        .select()
        .from(domainsTable)
        .where(
          and(eq(domainsTable.name, domain), eq(domainsTable.customerId, customerId))
        )
        .limit(1);

      if (!domainRecord) {
        throw new Error("Domain not found. Please register the domain first.");
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update domain with verification token
      await db
        .update(domainsTable)
        .set({
          verificationToken: token,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(domainsTable.id, domainRecord.id));

      // Log verification attempt
      await db.insert(verificationLogsTable).values({
        domainId: domainRecord.id,
        customerId,
        verificationStep: "token_generated",
        status: "pending",
        details: "Verification token generated",
        createdAt: new Date(),
      });

      return token;
    } catch (error) {
      throw new Error(
        `Failed to generate verification token: ${(error as any)?.message}`
      );
    }
  }

  /**
   * Step 2: Verify TXT record exists
   */
  async verifyTxtRecord(
    domain: string,
    customerId: string,
    txtRecordVerifyKey: string
  ) {
    try {
      // Get the domain record with verification token
      const [domainRecord] = await db
        .select()
        .from(domainsTable)
        .where(
          and(eq(domainsTable.name, domain), eq(domainsTable.customerId, customerId))
        )
        .limit(1);

      if (!domainRecord || !domainRecord.verificationToken) {
        throw new Error("No pending verification for this domain");
      }

      if (
        domainRecord.tokenExpiresAt &&
        new Date() > domainRecord.tokenExpiresAt
      ) {
        await db
          .update(domainsTable)
          .set({ verificationToken: null, tokenExpiresAt: null })
          .where(eq(domainsTable.id, domainRecord.id));
        throw new Error("Verification token expired");
      }

      // Look for TXT record at the root domain
      const records = await dns.resolveTxt(domain);
      const flatRecords = records.flat();

      // Check if our verification token exists
      const expectedRecord = `${txtRecordVerifyKey}=${domainRecord.verificationToken}`;
      const isVerified = flatRecords.some((record) =>
        record.includes(expectedRecord)
      );

      // Log verification attempt
      await db.insert(verificationLogsTable).values({
        domainId: domainRecord.id,
        customerId,
        verificationStep: "txt_record",
        status: isVerified ? "success" : "failed",
        details: isVerified
          ? "TXT record verification successful"
          : "TXT record not found or invalid",
        createdAt: new Date(),
      });

      if (isVerified) {
        // Clear verification token after successful verification
        await db
          .update(domainsTable)
          .set({
            verificationToken: null,
            tokenExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(eq(domainsTable.id, domainRecord.id));

        return true;
      }

      return false;
    } catch (error) {
      console.error(`DNS verification failed for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Step 3: Verify CNAME points to your service
   */
  async verifyCnameRecord(
    domain: string,
    expectedTarget: string,
    customerId: string
  ) {
    try {
      const records = await dns.resolveCname(domain);
      const isVerified = records.some((record) => record === expectedTarget);

      // Log verification attempt
      const [domainRecord] = await db
        .select()
        .from(domainsTable)
        .where(
          and(eq(domainsTable.name, domain), eq(domainsTable.customerId, customerId))
        )
        .limit(1);

      if (domainRecord) {
        await db.insert(verificationLogsTable).values({
          domainId: domainRecord.id,
          customerId,
          verificationStep: "cname_record",
          status: isVerified ? "success" : "failed",
          details: isVerified
            ? "CNAME record verification successful"
            : "CNAME record not found or invalid",
          createdAt: new Date(),
        });
      }

      return isVerified;
    } catch (error) {
      console.error(`CNAME verification failed for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Complete domain verification flow
   */
  async completeDomainVerification(
    domain: string,
    serviceHost: string,
    customerId: string,
    txtRecordVerifyKey: string
  ) {
    // First verify TXT record (proves ownership)
    const txtVerified = await this.verifyTxtRecord(
      domain,
      customerId,
      txtRecordVerifyKey
    );
    if (!txtVerified) {
      throw new Error("TXT record verification failed");
    }

    // Then verify CNAME points to your service
    const cnameVerified = await this.verifyCnameRecord(
      domain,
      serviceHost,
      customerId
    );
    if (!cnameVerified) {
      throw new Error("CNAME record verification failed");
    }

    // Mark domain as verified
    const [domainRecord] = await db
      .select()
      .from(domainsTable)
      .where(
        and(eq(domainsTable.name, domain), eq(domainsTable.customerId, customerId))
      )
      .limit(1);

    if (domainRecord) {
      await db
        .update(domainsTable)
        .set({
          isVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(domainsTable.id, domainRecord.id));

      // Log completion
      await db.insert(verificationLogsTable).values({
        domainId: domainRecord.id,
        customerId,
        verificationStep: "completed",
        status: "success",
        details: "Domain verification completed successfully",
        createdAt: new Date(),
      });
    }

    return true;
  }

  /**
   * Get verification instructions for user
   */
  async getVerificationInstructions(
    domain: string,
    serviceHost: string,
    customerId: string,
    txtRecordVerifyKey: string
  ) {
    const [domainRecord] = await db
      .select()
      .from(domainsTable)
      .where(
        and(eq(domainsTable.name, domain), eq(domainsTable.customerId, customerId))
      )
      .limit(1);

    if (!domainRecord || !domainRecord.verificationToken) {
      throw new Error("No pending verification for this domain");
    }

    return {
      step1: {
        type: "TXT",
        name: domain,
        value: `${txtRecordVerifyKey}=${domainRecord.verificationToken}`,
        instruction: `Add this TXT record to ${domain}`,
      },
      step2: {
        type: "CNAME",
        name: domain,
        value: serviceHost,
        instruction: `After TXT verification, point ${domain} to ${serviceHost}`,
      },
    };
  }

  /**
   * Get domain status and verification details
   */
  async getDomainStatus(domain: string, customerId: string) {
    const [domainRecord] = await db
      .select()
      .from(domainsTable)
      .where(
        and(eq(domainsTable.name, domain), eq(domainsTable.customerId, customerId))
      )
      .limit(1);

    if (!domainRecord) {
      throw new Error("Domain not found");
    }

    return {
      domain: domainRecord.name,
      ip: domainRecord.ip,
      isVerified: domainRecord.isVerified,
      hasActivePendingVerification: !!domainRecord.verificationToken,
      createdAt: domainRecord.createdAt,
      updatedAt: domainRecord.updatedAt,
    };
  }
}
