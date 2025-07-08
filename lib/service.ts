import dns from "dns/promises";
import crypto from "crypto";

export class DomainVerificationService {
  private pendingVerifications: Map<any, any>;
  private verifiedDomains: Set<string>;

  constructor() {
    this.pendingVerifications = new Map();
    this.verifiedDomains = new Set();
  }

  /**
   * Step 1: Generate verification token for domain
   */
  generateVerificationToken(domain: string, userId: string) {
    const token = crypto.randomBytes(32).toString("hex");
    const verificationData = {
      domain,
      userId,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    this.pendingVerifications.set(domain, verificationData);
    return token;
  }

  /**
   * Step 2: Verify TXT record exists
   */
  async verifyTxtRecord(domain: string) {
    const pending = this.pendingVerifications.get(domain);
    if (!pending) {
      throw new Error("No pending verification for this domain");
    }

    if (new Date() > pending.expiresAt) {
      this.pendingVerifications.delete(domain);
      throw new Error("Verification token expired");
    }

    try {
      // Look for TXT record at the root domain
      const records = await dns.resolveTxt(domain);
      const flatRecords = records.flat();

      // Check if our verification token exists
      const expectedRecord = `yourservice-verify=${pending.token}`;
      const isVerified = flatRecords.some((record) =>
        record.includes(expectedRecord)
      );

      if (isVerified) {
        this.verifiedDomains.add(domain);
        this.pendingVerifications.delete(domain);
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
  async verifyCnameRecord(domain: string, expectedTarget: string) {
    try {
      const records = await dns.resolveCname(domain);
      return records.some((record) => record === expectedTarget);
    } catch (error) {
      console.error(`CNAME verification failed for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Complete domain verification flow
   */
  async completeDomainVerification(domain: string, serviceHost: string) {
    // First verify TXT record (proves ownership)
    const txtVerified = await this.verifyTxtRecord(domain);
    if (!txtVerified) {
      throw new Error("TXT record verification failed");
    }

    // Then verify CNAME points to your service
    const cnameVerified = await this.verifyCnameRecord(domain, serviceHost);
    if (!cnameVerified) {
      throw new Error("CNAME record verification failed");
    }

    return true;
  }

  /**
   * Get verification instructions for user
   */
  getVerificationInstructions(domain: string, serviceHost: string) {
    const pending = this.pendingVerifications.get(domain);
    if (!pending) {
      throw new Error("No pending verification for this domain");
    }

    return {
      step1: {
        type: "TXT",
        name: domain,
        value: `yourservice-verify=${pending.token}`,
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
}
