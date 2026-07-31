const express = require("express");
const app = express();
const authRoutes = require("./src/routes/authRoutes");

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Craftad API is running"
    });
});

module.exports = app;