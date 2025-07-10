import express from "express";
import swaggerUi from "swagger-ui-express";
import { DomainVerificationService } from "./service";
import { setupEnvironment } from "./setup";
import { jsDocSpecs } from "./docs";

const app = express();

const verificationService = new DomainVerificationService();

const { serviceHost } = setupEnvironment();

app.use(express.json());

app.get("/", async (_, res) => {
  res.json({
    message: "Domain Verification Service is running",
  });
});

/**
 * @swagger
 * tags:
 *   name: Books
 *   description: The books managing API
 * /books:
 *   get:
 *     summary: Lists all the books
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: The list of the books
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *   post:
 *     summary: Create a new book
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Book'
 *     responses:
 *       200:
 *         description: The created book.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       500:
 *         description: Some server error
 * /books/{id}:
 *   get:
 *     summary: Get the book by id
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The book id
 *     responses:
 *       200:
 *         description: The book response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: The book was not found
 *   put:
 *    summary: Update the book by the id
 *    tags: [Books]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: The book id
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Book'
 *    responses:
 *      200:
 *        description: The book was updated
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Book'
 *      404:
 *        description: The book was not found
 *      500:
 *        description: Some error happened
 *   delete:
 *     summary: Remove the book by id
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The book id
 *
 *     responses:
 *       200:
 *         description: The book was deleted
 *       404:
 *         description: The book was not found
 */
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

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(jsDocSpecs, { explorer: true })
);

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
