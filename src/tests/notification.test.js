const request = require("supertest");
const app = require("../app");
const User = require("../src/models/User");
const Notification = require("../src/models/Notification");
const jwt = require("jsonwebtoken");

require("./setup"); // Import in-memory database lifecycle setup

describe("Notification API Integration Tests", () => {
    let userToken;
    let testUser;

    beforeEach(async () => {
        // 1. Create a mock user
        testUser = await User.create({
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            password: "hashedpassword123",
            role: "customer"
        });

        // 2. Generate test JWT
        userToken = jwt.sign(
            { userId: testUser._id, role: testUser.role },
            process.env.JWT_SECRET || "test_secret",
            { expiresIn: "1h" }
        );
    });

    describe("GET /api/notifications", () => {
        it("should retrieve logged-in user's notifications and unread count", async () => {
            // Seed test notifications in memory DB
            await Notification.create([
                {
                    user: testUser._id,
                    type: "JOB_STARTED",
                    title: "Job Started",
                    message: "Artisan started the work",
                    isRead: false
                },
                {
                    user: testUser._id,
                    type: "JOB_COMPLETED",
                    title: "Job Completed",
                    message: "Artisan completed work",
                    isRead: false
                }
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