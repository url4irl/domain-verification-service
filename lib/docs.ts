import swaggerJsDoc from "swagger-jsdoc";
import openApiSpec from "../openapi.json";

const options: swaggerJsDoc.Options = {
  definition: openApiSpec,
  apis: [],
};

export const jsDocSpecs = swaggerJsDoc(options);
