const mongoose = require("mongoose");
const Escrow = require("../models/Escrow");

exports.releaseEscrow = async (req, res) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const clientId = req.user._id || req.user.id || req.user.userId;
        const escrowId = req.params.id;

        const escrow = await Escrow.findById(escrowId).session(session);

        // 1. Find the specific escrow record and lock it for this transaction
        if (!escrow) {
            throw new Error(`EscrowId ${escrowId} not found`);
        }

        // 2. Authorization: Only the client who created the escrow can release it
        if (escrow.client.toString() !== clientId.toString()) {
            throw new Error(`Unauthorized: Only the client can release these funds`);
        }

        // 3. State Validation (Idempotency): Prevent double-spending
        if (escrow.escrowStatus !== "HELD"){
            throw new Error(`Cannot release funds. Current status is ${escrow.escrowStatus}`);
        }

        // 4. Update the Escrow State
        escrow.escrowStatus = "RELEASED";
        await escrow.save({ session });

    }catch (error) {
        await session.abortTransaction();

        // Differentiate between our intentional validation errors and server crashes
        const statusCode = error.message.includes("Unauthorized") || error.message.includes("Cannot release") ? 400 : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    } finally {
        session.endSession();
    }
};
exports.raiseDispute = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const clientId = req.user._id || req.user.id || req.user.userId;
        const escrowId = req.params.id; // Get the specific transaction from URL
        const { reason } = req.body; // Client MUST provide a reason

        // 1. Payload validation
        if (!reason || reason.trim() === "") {
            throw new Error("Validation Error: A dispute reason is required");
        }

        // 2. Find the escrow
        const escrow = await Escrow.findById(escrowId).session(session);
        if (!escrow) {
            throw new Error("Escrow record not found");
        }

        // 3. Authorization: Only the paying client can dispute
        if (escrow.client.toString() !== clientId.toString()) {
            throw new Error("Unauthorized: Only the client can raise a dispute");
        }

        // 4. State Validation: Can only dispute funds that are currently HELD
        if (escrow.escrowStatus !== "HELD") {
            throw new Error(`Cannot dispute funds. Current status is ${escrow.escrowStatus}`);
        }

        // 5. Update State: Freeze the funds and attach the reason
        escrow.escrowStatus = "DISPUTED";
        escrow.disputeReason = reason;

        await escrow.save({ session });
        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Funds have been frozen and dispute raised successfully",
            escrow
        });

    } catch (error) {
        await session.abortTransaction();

        const statusCode = error.message.includes("Validation") || error.message.includes("Unauthorized") || error.message.includes("Cannot dispute") ? 400 : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    } finally {
        session.endSession();
    }
};

exports.resolveDispute = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const adminId = req.user._id || req.user.id || req.user.userId;
        const escrowId = req.params.id;
        const { resolution } = req.body;

        // 1. Strict Payload Validation: Accept ONLY these two exact strings
        const validResolutions = ["REFUNDED", "FORCED_RELEASED"];
        if (!validResolutions.includes(resolution)) {
            throw new Error('Validation Error: resolution must be exactly "REFUNDED" or "FORCED_RELEASED"');
        }

        // 2. Find the escrow record
        const escrow = await Escrow.findById(escrowId).session(session);
        if (!escrow) {
            throw new Error("Escrow record not found");
        }

        // 3. State Validation: You can ONLY resolve an escrow that is actively DISPUTED
        if (escrow.escrowStatus !== "DISPUTED") {
            throw new Error(`Cannot resolve escrow. Current status is ${escrow.escrowStatus}, expected DISPUTED.`);
        }

        // 4. Execute the Verdict
        escrow.escrowStatus = resolution;
        escrow.resolvedBy = adminId;
        escrow.disputeReason = escrow.disputeReason + ` [Resolved by Admin ${adminId}]`;

        await escrow.save({ session });
        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: `Dispute successfully resolved. Funds have been ${resolution}.`,
            escrow
        });

    } catch (error) {
        await session.abortTransaction();

        // 400 for bad input/state, 500 for actual server crashes
        const statusCode = error.message.includes("Validation") || error.message.includes("Cannot resolve") ? 400 : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    } finally {
        session.endSession();
    }
};