const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let replSet;

beforeAll(async () => {
    // 1. Boot up an in-memory replica set (Required for Mongoose Transactions)
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();

    if (!uri.includes("127.0.0.1") && !uri.includes("localhost")) {
        throw new Error("Refusing to run tests against a remote database.");
    }

    await mongoose.connect(uri);
});

afterAll(async () => {
    // 2. Shut down cleanly
    await mongoose.disconnect();
    if (replSet) {
        await replSet.stop();
    }
});

afterEach(async () => {
    // 3. Clear database between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});