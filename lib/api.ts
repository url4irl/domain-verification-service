import express from "express";
import { DomainVerificationService } from "./service";

const app = express();

const verificationService = new DomainVerificationService();

if (!process.env.SERVICE_HOST) {
  throw new Error("SERVICE_HOST environment variable is not set");
}

// Your service hostname (what users will CNAME to)
const SERVICE_HOST = process.env.SERVICE_HOST;

app.use(express.json());

// Start domain verification process
app.post("/api/domains/verify", async (req, res) => {
  const { domain, userId } = req.body;

  try {
    const token = verificationService.generateVerificationToken(domain, userId);
    const instructions = verificationService.getVerificationInstructions(
      domain,
      SERVICE_HOST
    );

    res.json({
      success: true,
      token,
      instructions,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Check verification status
app.post("/api/domains/check", async (req, res) => {
  const { domain } = req.body;

  try {
    const isVerified = await verificationService.completeDomainVerification(
      domain,
      SERVICE_HOST
    );

    if (isVerified) {
      // Here you would update Traefik configuration
      await updateAppDomainsConfig(domain);

      res.json({
        success: true,
        message: "Domain verified successfully",
        domain,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Function to update Traefik configuration
async function updateAppDomainsConfig(domain: string) {
  // 1. Update which domains the application can respond to on the Platform level
  // 2. Update the application's database to include the new domain associated with the user
  // 3. Test if the domain is reachable and properly configured (the application must respond to requests on this domain with a special header to indicate that the domain is correctly associated with the user/app)
}
