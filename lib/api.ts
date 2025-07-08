import express from "express";
import { DomainVerificationService } from "./service";

const app = express();

const verificationService = new DomainVerificationService();

// Your service hostname (what users will CNAME to)
const SERVICE_HOST = "your-service.example.com";

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
      await updateTraefikConfig(domain);

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
async function updateTraefikConfig(domain) {
  // Option 1: File-based configuration (docker-compose labels)
  // You would dynamically update your docker-compose.yml or
  // create new service definitions with the verified domain

  // Option 2: API-based configuration (if using Traefik API)
  // Make HTTP requests to Traefik API to add new routes

  // Option 3: Service discovery (recommended)
  // Update your service labels/tags so Traefik picks up the new domain

  console.log(`Updating Traefik config for domain: ${domain}`);

  // Example: Update service labels in your orchestrator
  // This is pseudo-code - actual implementation depends on your setup
  /*
  await docker.updateService('your-app', {
    labels: {
      [`traefik.http.routers.${domain.replace('.', '-')}.rule`]: `Host(\`${domain}\`)`,
      [`traefik.http.routers.${domain.replace('.', '-')}.tls`]: 'true',
      [`traefik.http.routers.${domain.replace('.', '-')}.tls.certresolver`]: 'letsencrypt'
    }
  });
  */
}
