const request = require("supertest");
const app = require("../../app");
const User = require("../models/User");
const Notification = require("../models/Notification");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

require("./setup"); // Import in-memory database lifecycle setup

describe("Notification API Integration Tests", () => {
    let userToken;
    let testUser;

    beforeEach(async () => {
        // 1. Create a mock user
        testUser = await User.create({
            firstName: "John",
            lastName: "Doe",
            fullName: "John Doe",
            email: "john@example.com",
            password: "password123",
            role: "customer"
        });

        // 2. Generate test JWT containing all possible ID formats
        userToken = jwt.sign(
            {
                id: testUser._id,
                userId: testUser._id,
                _id: testUser._id,
                role: testUser.role
            },
            process.env.JWT_SECRET || "test_secret",
            { expiresIn: "1h" }
        );
    });

    describe("GET /api/notifications", () => {
        it("should retrieve logged-in user's notifications and unread count", async () => {
            await Notification.create([
                { user: testUser._id, type: "JOB_STARTED", title: "Job Started", message: "Artisan started the work", isRead: false },
                { user: testUser._id, type: "JOB_COMPLETED", title: "Job Completed", message: "Artisan completed work", isRead: false }
            ]);

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(2);
            expect(res.body.meta.unreadCount).toBe(2);
        });
    });

    describe("PATCH /api/notifications/:notificationId/read", () => {
        it("should mark a single notification as read", async () => {
            const notification = await Notification.create({
                user: testUser._id,
                type: "JOB_COMPLETED",
                title: "Test Notification",
                message: "Test message",
                isRead: false
            });

            const res = await request(app)
                .patch(`/api/notifications/${notification._id}/read`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.notification.isRead).toBe(true);
        });
    });

    describe("PATCH /api/notifications/read-all", () => {
        it("should mark all user notifications as read", async () => {
            await Notification.create([
                { user: testUser._id, type: "JOB_STARTED", title: "N1", message: "M1", isRead: false },
                { user: testUser._id, type: "JOB_COMPLETED", title: "N2", message: "M2", isRead: false }
            ]);

            const res = await request(app)
                .patch("/api/notifications/read-all")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);

            const unreadCount = await Notification.countDocuments({ user: testUser._id, isRead: false });
            expect(unreadCount).toBe(0);
        });
    });
});

// This runs automatically after all tests are finished
afterAll(async () => {
    // Forcefully close the database connection
    await mongoose.connection.close();
});