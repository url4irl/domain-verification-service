import express from "express";
import { DomainVerificationService } from "./service";
import { setupEnvironment } from "./setup";

const app = express();

const verificationService = new DomainVerificationService();

const { serviceHost } = setupEnvironment();

app.use(express.json());

app.get("/", async (_, res) => {
  res.json({
    message: "Domain Verification Service is running",
  });
});

// Start domain verification process
app.post("/api/domains/verify", async (req, res) => {
  const { domain, userId } = req.body;

  try {
    const token = verificationService.generateVerificationToken(domain, userId);
    const instructions = verificationService.getVerificationInstructions(
      domain,
      serviceHost
    );

    res.json({
      success: true,
      token,
      instructions,
    });
  } catch (error) {
    res.status(400).json({ error: (error as any)?.message });
  }
});

// Check verification status
app.post("/api/domains/check", async (req, res) => {
  const { domain } = req.body;

  try {
    const isVerified = await verificationService.completeDomainVerification(
      domain,
      serviceHost
    );

    if (isVerified) {
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
      error: (error as any)?.message,
    });
  }
});

app.listen(4000, () => {
  console.log(
    "Domain Verification Service is running on http://localhost:4000"
  );
});

// This should live on the Platform level, not in this service
async function updateAppDomainsConfig(domain: string) {
  // 1. Update which domains the application can respond to on the Platform level
  // 2. Update the application's database to include the new domain associated with the user
  // 3. Test if the domain is reachable and properly configured (the application must respond to requests on this domain with a special header to indicate that the domain is correctly associated with the user/app)
}
