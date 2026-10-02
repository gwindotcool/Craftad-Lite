const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Craftad Lite API",
            version: "1.0.0",
            description: "Official API Documentation for the Craftad Artisan Marketplace",
            contact: {
                name: "Backend Engineering Team"
            }
        },

        servers: [
            {
                url:
                    process.env.NODE_ENV === "production"
                        ? process.env.BACKEND_URL
                        : "http://localhost:3000",
                description: "Environment Server"
            }
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        }
    },

    // Swagger reads documentation from the docs folder
    apis: ["./src/docs/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;