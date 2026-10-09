const express = require("express");
const cors = require("cors");
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();

app.set('trust proxy', 1);


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
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./src/config/swagger");


// 1. WEBHOOKS (Must be before express.json() and before rate limiters)
app.use("/api/webhook", webhookRoute);

// 2. SECURITY HEADERS & CORS
app.use(helmet());

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_DASHBOARD_URL,
    process.env.BACKEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000"
].filter(Boolean);


app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS'));
        }
    },
    credentials: true
}));

// 3. BODY PARSER (MUST BE NEAR THE TOP, BEFORE RATE LIMITERS AND ROUTES)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

// 7. GLOBAL ERROR HANDLING MIDDLEWARE (Must be the last middleware)
app.use((err, req, res, next) => {
    console.error("🔥 Unhandled Error:", err.stack);

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
});

module.exports = app;