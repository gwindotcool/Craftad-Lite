
require("./setup.js");

process.env.JWT_SECRET = "test_super_secret_key_for_jest";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../../app");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Admin = require("../models/Admin");
const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Wallet = require("../models/Wallet");
const PlatformWallet = require("../models/PlatformWallet");
const Escrow = require("../models/Escrow");

const generateToken = (id, role) =>
    jwt.sign(
        { _id: id, id: id, userId: id, role },
        process.env.JWT_SECRET
    );

describe("Escrow & Dispute Financial Engine", () => {
    let client, artisan, admin;
    let clientToken, adminToken;
    let happyJob, disputeJob;
    let disputeEscrowId;

    beforeEach(async () => {
        // 1. Create fresh users for this test.
        client = await User.create({
            fullName: "Client Test",
            email: "client@test.com",
            password: "password",
            role: "customer"
        });

        artisan = await User.create({
            fullName: "Artisan Test",
            email: "artisan@test.com",
            password: "password",
            role: "artisan"
        });

        clientToken = generateToken(client._id, client.role);

        // 2. Create an admin using the real Admin model.
        admin = await Admin.create({
            name: "Admin Test",
            email: "admin@test.com",
            password: "testpassword123",
            role: "super_admin",
            isActive: true
        });

        // Keep the role consistent with Admin.js.
        adminToken = generateToken(admin._id, admin.role);

        // 3. Create the customer's wallet.
        await Wallet.create({
            user: client._id,
            balance: 100000,
            currency: "NGN"
        });

        // 4. Create fresh jobs.
        happyJob = await Job.create({
            customer: client._id,
            title: "Smooth",
            description: "Job 1",
            category: "plumber",
            budget: 20000,
            location: "Lagos",
            status: "open"
        });

        disputeJob = await Job.create({
            customer: client._id,
            title: "Bad",
            description: "Job 2",
            category: "electrician",
            budget: 50000,
            location: "Lagos",
            status: "open"
        });

        // 5. Create accepted applications.
        await Application.create({
            job: happyJob._id,
            artisan: artisan._id,
            message: "I will do it.",
            proposedPrice: 20000,
            status: "accepted"
        });

        await Application.create({
            job: disputeJob._id,
            artisan: artisan._id,
            message: "I will try.",
            proposedPrice: 50000,
            status: "accepted"
        });
    });

    describe("1. Funding the Escrow", () => {
        it("should deduct from client wallet and lock funds in Escrow", async () => {
            const res = await request(app)
                .post(`/api/escrow/fund/${happyJob._id}`)
                .set("Authorization", `Bearer ${clientToken}`);

            if (res.statusCode !== 200) {
                console.error("Fund Escrow Error:", res.body);
            }

            expect(res.statusCode).toBe(200);

            const clientWallet = await Wallet.findOne({
                user: client._id
            });

            const platformWallet = await PlatformWallet.findOne({
                key: "main"
            });

            const escrowRecord = await Escrow.findOne({
                job: happyJob._id
            });

            expect(clientWallet.balance).toBe(80000);
            expect(platformWallet.escrowBalance).toBe(20000);
            expect(escrowRecord.escrowStatus).toBe("HELD");
        });
    });

    describe("2. Releasing the Escrow (Happy Path)", () => {
        it("should pay the artisan and take a 5% platform fee", async () => {
            // This test must fund its own escrow.
            const fundRes = await request(app)
                .post(`/api/escrow/fund/${happyJob._id}`)
                .set("Authorization", `Bearer ${clientToken}`);

            if (fundRes.statusCode !== 200) {
                console.error("Fund Escrow Error:", fundRes.body);
            }

            expect(fundRes.statusCode).toBe(200);

            const happyEscrowId = fundRes.body.escrow._id;

            // Create the artisan's wallet before payout.
            await Wallet.create({
                user: artisan._id,
                balance: 0,
                currency: "NGN"
            });

            const res = await request(app)
                .patch(`/api/escrow/${happyEscrowId}/release`)
                .set("Authorization", `Bearer ${clientToken}`);

            if (res.statusCode !== 200) {
                console.error("Release Escrow Error:", res.body);
            }

            expect(res.statusCode).toBe(200);

            const artisanWallet = await Wallet.findOne({
                user: artisan._id
            });

            const platformWallet = await PlatformWallet.findOne({
                key: "main"
            });

            const escrowRecord = await Escrow.findById(happyEscrowId);

            expect(artisanWallet.balance).toBe(19000);
            expect(platformWallet.escrowBalance).toBe(0);
            expect(platformWallet.totalFees).toBe(1000);
            expect(escrowRecord.escrowStatus).toBe("RELEASED");
            expect(escrowRecord.platformFee).toBe(1000);
        });
    });

    describe("3. Disputing & Refunding", () => {
        beforeEach(async () => {
            // Each dispute test gets its own HELD escrow.
            const escrow = await Escrow.create({
                job: disputeJob._id,
                client: client._id,
                artisan: artisan._id,
                amount: 50000,
                reference: `ESC-TEST-${new mongoose.Types.ObjectId()}`,
                escrowStatus: "HELD"
            });

            disputeEscrowId = escrow._id;

            // Move the funds into escrow for this test.
            await Wallet.findOneAndUpdate(
                { user: client._id },
                { $inc: { balance: -50000 } }
            );

            await PlatformWallet.findOneAndUpdate(
                { key: "main" },
                { $inc: { escrowBalance: 50000 } },
                { upsert: true, new: true }
            );
        });

        it("should allow a client to freeze the funds", async () => {
            const res = await request(app)
                .patch(`/api/escrow/${disputeEscrowId}/dispute`)
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    reason: "Artisan never showed up."
                });

            if (res.statusCode !== 200) {
                console.error("Dispute Error:", res.body);
            }

            expect(res.statusCode).toBe(200);

            const escrowRecord = await Escrow.findById(disputeEscrowId);

            expect(escrowRecord.escrowStatus).toBe("DISPUTED");
            expect(escrowRecord.disputeReason).toContain(
                "Artisan never showed up"
            );
        });

        it("should allow an admin to refund the client", async () => {
            // A refund can only resolve an escrow already in DISPUTED state.
            const disputeRes = await request(app)
                .patch(`/api/escrow/${disputeEscrowId}/dispute`)
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    reason: "Artisan never showed up."
                });

            expect(disputeRes.statusCode).toBe(200);

            const res = await request(app)
                .patch(`/api/escrow/${disputeEscrowId}/resolve`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    resolution: "REFUNDED"
                });

            if (res.statusCode !== 200) {
                console.error("Admin Resolve Error:", res.body);
            }

            expect(res.statusCode).toBe(200);

            const clientWallet = await Wallet.findOne({
                user: client._id
            });

            const platformWallet = await PlatformWallet.findOne({
                key: "main"
            });

            const escrowRecord = await Escrow.findById(disputeEscrowId);

            // 100,000 initial balance - 50,000 escrow + 50,000 refund.
            expect(clientWallet.balance).toBe(100000);
            expect(platformWallet.escrowBalance).toBe(0);
            expect(escrowRecord.escrowStatus).toBe("REFUNDED");
        });
    });
});
