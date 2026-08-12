const express = require("express");
const app = express();
const authRoutes = require("./src/routes/authRoutes");
const artisanRoutes = require("./src/routes/artisanRoutes");
const jobRoutes = require("./src/routes/jobRoutes");
const applicationRoutes = require("./src/routes/applicationRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/artisans", artisanRoutes);
app.use("/api/job", jobRoutes)
app.use("/api/applications", applicationRoutes )
app.use("/api/reviews", reviewRoutes);


app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Craftad API is running"
    });
});

module.exports = app;