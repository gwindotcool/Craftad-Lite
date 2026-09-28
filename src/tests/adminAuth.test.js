const crypto = require("crypto");
Object.defineProperty(globalThis, "crypto", { value: crypto.webcrypto });


const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../app");
const Admin = require("../models/Admin");

// Load env vars if you aren't doing it globally in Jest
require("dotenv").config();

describe("Admin Authentication API", () => {
    // Tell Jest to wait up to 30 seconds before timing out
    jest.setTimeout(30000);

    // 1. Connect to the database before ANY tests run
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/craftad_lite");
        }
    });

    // ... (leave the rest of your tests and hooks exactly the same)
    // 2. Close the connection after ALL tests finish so Jest can exit
    afterAll(async () => {
        await mongoose.connection.close();
    });

    // 3. Clear the admin table before EACH test so tests don't pollute each other
    beforeEach(async () => {
        await Admin.deleteMany();
    });

    it("should successfully bootstrap a super_admin when the database is empty", async () => {
        const res = await request(app)
            .post("/api/admin/auth/register")
            .send({
                name: "Test Admin",
                email: "testadmin@craftad.com",
                password: "Password123!"
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.admin.role).toBe("super_admin");
    });

    it("should block public registration if an admin already exists", async () => {
        // Seed the database with the first admin
        await Admin.create({
            name: "First Admin",
            email: "first@craftad.com",
            password: "admin123",
            role: "super_admin"
        });

        // Attempt to register a second admin without a token
        const res = await request(app)
            .post("/api/admin/auth/register")
            .send({
                name: "Hacker",
                email: "hacker@craftad.com",
                password: "Password123!"
            });

        // The protectAdmin middleware should instantly reject this
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});