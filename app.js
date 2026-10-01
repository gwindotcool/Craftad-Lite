const express = require("express");
const cors = require("cors");
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();

const authRoutes = require("./src/routes/authRoutes");
const artisanRoutes = require("./src/routes/artisanRoutes");
const jobRoutes = require("./src/routes/jobRoutes");
const applicationRoutes = require("./src/routes/applicationRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const walletRoutes = require("./src/routes/walletRoutes");
const transactionRoutes = require("./src/routes/transactionRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const webhookRoute = require("./src/routes/webhookRoute");
const chatRoutes = require("./src/routes/chatRoutes");
const adminAuthRoutes = require("./src/routes/adminAuthRoutes");
const adminUserRoutes = require("./src/routes/adminUserRoutes");
const escrowRoutes = require("./src/routes/escrowRoutes");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");


// 1. WEBHOOKS (Must be before express.json() and before rate limiters)
app.use("/api/webhook", webhookRoute);

// 2. SECURITY HEADERS & CORS
app.use(helmet());

const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL, process.env.ADMIN_DASHBOARD_URL] // e.g., https://craftad.com
    : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS'));
        }
    },
    credentials: true
}));

// 3. RATE LIMITING (Placed after webhook, so webhook is ignored)
const globalLimiter = rateLimit({
    max: 100,
    windowMs: 15 * 60 * 1000,
    message: { success: false, error: 'Too many requests from this IP, please try again in 15 minutes.' }
});
app.use('/api', globalLimiter);

// 3b. STRICT AUTH LIMITER (Prevents brute-force credential stuffing)
const authLimiter = rateLimit({
    max: 5, // 5 failed attempts
    windowMs: 15 * 60 * 1000, // per 15 minutes
    message: { success: false, error: 'Too many login attempts. Account locked for 15 minutes.' }
});

// Apply this strict limiter ONLY to authentication routes
app.use('/api/auth/login', authLimiter);
app.use('/api/admin/auth/login', authLimiter);

// 4. BODY PARSER (Converts stream to req.body)
app.use(express.json());

// 5. DATA SANITIZATION (Express 5 Compatible Wrapper)
app.use((req, res, next) => {
    // We manually sanitize the objects in-place instead of letting
    // the package try (and fail) to reassign the read-only Express 5 properties.
    if (req.body) mongoSanitize.sanitize(req.body);
    if (req.query) mongoSanitize.sanitize(req.query);
    if (req.params) mongoSanitize.sanitize(req.params);
    next();
});



// 5.5 SWAGGER API DOCUMENTATION SETUP
const swaggerOptions = {
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
                url: process.env.NODE_ENV === "production" ? process.env.BACKEND_URL : "http://localhost:3000",
                description: "Environment Server"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [{ bearerAuth: [] }], // Applies JWT requirement globally to docs
    },
    apis: ["./src/routes/*.js"], // Tells Swagger to look for comments in all your route files
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// 6. STANDARD API ROUTES

app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/artisans", artisanRoutes);
app.use("/api/job", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/escrow", escrowRoutes);

app.get("/api/health", (req, res) => {
    res.status(200).json({ success: true, message: "Craftad API is running securely" });
});

module.exports = app;