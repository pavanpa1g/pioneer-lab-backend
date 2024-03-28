const swaggerJSDoc = require("swagger-jsdoc");

// Swagger definition
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Your API Documentation",
    version: "1.0.0",
    description: "Documentation for your API endpoints",
  },
  servers: [
    {
      url: "http://localhost:5001", // Update with your server URL
      description: "Development server",
    },
  ],
};

// Options for the Swagger JSdoc
const options = {
  swaggerDefinition,
  apis: ["index.js"], // Specify the file where you document your endpoints
};

// Initialize Swagger JSDoc
const swaggerSpec = swaggerJSDoc(options);

// Add security definitions
swaggerSpec.components = {
  securitySchemes: {
    BearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },
  schemas: {
    Entry: {
      type: "object",
      properties: {
        // Define the properties of the Entry schema here
      },
    },
  },
};

module.exports = swaggerSpec;
