const mongoose = require("mongoose");
require("dotenv").config(); // Load your .env file

// Import your Mongoose models
const User = require("../models/User");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");

// Dummy Data Arrays
const admins = [
    { name: "Super Admin", email: "admin@craftad.com", password: "Password123!", role: "super_admin" }
];

const users = [
    { firstName: "John", lastName: "Doe", fullName: "John Doe", email: "john@example.com", password: "password123", role: "customer" },
    { firstName: "Jane", lastName: "Smith", fullName: "Jane Smith", email: "jane@example.com", password: "password123", role: "artisan" }
];

// Failsafe: Never allow this to run in production
if (process.env.NODE_ENV === "production") {
    console.error("CRITICAL DANGER: Attempted to run seeder in production environment. Aborting.");
    process.exit(1);
}

// Ensure we connect to the main DEV database, not the test database
const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/craftad_lite";
    await mongoose.connect(mongoUri);
};

const importData = async () => {
    try {
        await connectDB();

        // 1. Clear absolutely everything
        await Admin.deleteMany();
        await User.deleteMany();
        await Notification.deleteMany();
        // await Job.deleteMany();
        // await Dispute.deleteMany();

        // 2. Inject fresh data
        await Admin.insertMany(admins);
        await User.insertMany(users);

        console.log("Data Imported Successfully.");
        process.exit();
    } catch (error) {
        console.error(`Import Error: ${error.message}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await connectDB();

        await Admin.deleteMany();
        await User.deleteMany();
        await Notification.deleteMany();

        console.log("Data Destroyed Successfully.");
        process.exit();
    } catch (error) {
        console.error(`Destroy Error: ${error.message}`);
        process.exit(1);
    }
};

// Check terminal arguments to decide whether to import or destroy
if (process.argv[2] === "-d") {
    destroyData();
} else {
    importData();
}