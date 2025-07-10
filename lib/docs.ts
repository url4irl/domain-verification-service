import swaggerJsDoc from "swagger-jsdoc";

const options: swaggerJsDoc.Options = {
  definition: {
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
      },
    ],
  },
  apis: ["./api/*.ts"],
};

export const jsDocSpecs = swaggerJsDoc(options);
