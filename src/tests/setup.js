const crypto = require("crypto");
Object.defineProperty(globalThis, "crypto", { value: crypto.webcrypto });

const mongoose = require("mongoose");
require("dotenv").config();

beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/craftad_lite", {
            serverSelectionTimeoutMS: 5000,
        });
    }
}, 30000);

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }
    }
}, 30000);

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
}, 30000);