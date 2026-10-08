const crypto = require("crypto");
Object.defineProperty(globalThis, "crypto", { value: crypto.webcrypto });

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../app");
const Notification = require("../models/Notification");
const User = require("../models/User"); // Adjust to your user model path

require("dotenv").config();

describe("Notification API Integration Tests", () => {
    jest.setTimeout(30000);

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/craftad_lite");
        }
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Notification.deleteMany();
    });

    // Your notification tests go here...
    it("should retrieve logged-in user's notifications and unread count", async () => {
        // Add your test implementation
        expect(true).toBe(true);
    });
});