// Inject test environment variables BEFORE anything else loads
process.env.JWT_SECRET = "test_super_secret_key_for_jest";
process.env.NODE_ENV = "test";

const crypto = require("crypto");
if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", { value: crypto.webcrypto });
}

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let memoryServer;

beforeAll(async () => {
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    if (!uri.includes("127.0.0.1") && !uri.includes("localhost")) {
        throw new Error("Refusing to run tests against a remote database.");
    }
    if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
    }
}, 60000);

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
    if (memoryServer) {
        await memoryServer.stop();
    }
}, 30000);