import swaggerJsDoc from "swagger-jsdoc";

const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Domain Verification Service API",
    version: "0.1.0",
    description:
      "Verify and instruct domain configuration, enabling you to proceed pointing to them after DNS TXT record verification.",
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Development server",
    },
  ],
  paths: {
    "/": {
      get: {
        summary: "Health check endpoint",
        description: "Returns the status of the Domain Verification Service",
        operationId: "healthCheck",
        responses: {
          "200": {
            description: "Service is running",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Domain Verification Service is running",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/domains/verify": {
      post: {
        summary: "Generate domain verification token",
        description:
          "Generates a verification token and provides DNS setup instructions for domain verification",
        operationId: "generateVerificationToken",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["domain", "userId"],
                properties: {
                  domain: {
                    type: "string",
                    description: "The domain to verify (e.g., example.com)",
                    example: "example.com",
                  },
                  userId: {
                    type: "string",
                    description: "The ID of the user requesting verification",
                    example: "user123",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Verification token generated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    token: {
                      type: "string",
                      description:
                        "The verification token to be added to DNS records",
                      example: "a1b2c3d4e5f6...",
                    },
                    instructions: {
                      type: "object",
                      properties: {
                        step1: {
                          type: "object",
                          properties: {
                            type: {
                              type: "string",
                              example: "TXT",
                            },
                            name: {
                              type: "string",
                              example: "example.com",
                            },
                            value: {
                              type: "string",
                              example: "url4irl-verify=a1b2c3d4e5f6...",
                            },
                            instruction: {
                              type: "string",
                              example: "Add this TXT record to example.com",
                            },
                          },
                        },
                        step2: {
                          type: "object",
                          properties: {
                            type: {
                              type: "string",
                              example: "CNAME",
                            },
                            name: {
                              type: "string",
                              example: "example.com",
                            },
                            value: {
                              type: "string",
                              example: "your-service.com",
                            },
                            instruction: {
                              type: "string",
                              example:
                                "After TXT verification, point example.com to your-service.com",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - invalid input",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Invalid domain format",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/domains/check": {
      post: {
        summary: "Check domain verification status",
        description:
          "Verifies that the domain has been properly configured with both TXT and CNAME records",
        operationId: "checkDomainVerification",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["domain"],
                properties: {
                  domain: {
                    type: "string",
                    description: "The domain to check verification status for",
                    example: "example.com",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Domain verification successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "Domain verified successfully",
                    },
                    domain: {
                      type: "string",
                      example: "example.com",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Domain verification failed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      examples: [
                        "TXT record verification failed",
                        "CNAME record verification failed",
                        "No pending verification for this domain",
                        "Verification token expired",
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            description: "Error message",
          },
        },
      },
      VerificationInstructions: {
        type: "object",
        properties: {
          step1: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["TXT"],
              },
              name: {
                type: "string",
              },
              value: {
                type: "string",
              },
              instruction: {
                type: "string",
              },
            },
          },
          step2: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["CNAME"],
              },
              name: {
                type: "string",
              },
              value: {
                type: "string",
              },
              instruction: {
                type: "string",
              },
            },
          },
        },
      },
    },
  },
};

const options: swaggerJsDoc.Options = {
  definition: openApiSpec,
  apis: [],
};

export const jsDocSpecs = swaggerJsDoc(options);
