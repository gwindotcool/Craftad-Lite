const crypto = require("crypto");
if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", { value: crypto.webcrypto });
}

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    throw new Error("CRITICAL: MONGODB_URI is missing in environment variables. Aborting tests to protect local data.");
}

beforeAll(async () => {
    if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
    }
}, 30000);

afterEach(async () => {
    if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
        const collections = mongoose.connection.collections;
        await Promise.all(
            Object.values(collections).map((collection) => collection.deleteMany({}))
        );
    }
}, 30000);

afterAll(async () => {
    if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
        await mongoose.connection.close();
    }
}, 30000);