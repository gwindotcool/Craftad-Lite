const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Job = require("../models/Job");
const ArtisanProfile = require("../models/ArtisanProfile");

// 1. Get or Create a Conversation for a Job
exports.getOrCreateConversation = async (req, res, next) => {
    try {
        const { jobId } = req.body;
        const userId = req.user.userId;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        // Check if job is assigned
        if (!job.assignedArtisan) {
            return res.status(400).json({
                success: false,
                message: "Cannot start chat until an artisan is assigned to the job",
            });
        }

        // Resolve assigned artisan's User ID
        const artisanProfile = await ArtisanProfile.findById(job.assignedArtisan);
        if (!artisanProfile) {
            return res.status(404).json({ success: false, message: "Artisan profile not found" });
        }

        const customerUserId = job.customer.toString();
        const artisanUserId = artisanProfile.user.toString();

        // Ensure logged-in user is either the customer or assigned artisan
        if (userId !== customerUserId && userId !== artisanUserId) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access chat for this job",
            });
        }

        // Look for existing conversation or create new one
        let conversation = await Conversation.findOne({ job: jobId })
            .populate("customer", "firstName lastName profilePicture")
            .populate("artisan", "firstName lastName profilePicture")
            .populate("job", "title status");

        if (!conversation) {
            conversation = await Conversation.create({
                job: jobId,
                customer: customerUserId,
                artisan: artisanUserId,
            });

            conversation = await Conversation.findById(conversation._id)
                .populate("customer", "firstName lastName profilePicture")
                .populate("artisan", "firstName lastName profilePicture")
                .populate("job", "title status");
        }

        res.status(200).json({
            success: true,
            data: conversation,
        });
    } catch (error) {
        next(error);
    }
};

// 2. Get All Conversations for Logged-In User
exports.getUserConversations = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const conversations = await Conversation.find({
            $or: [{ customer: userId }, { artisan: userId }],
        })
            .populate("customer", "firstName lastName profilePicture")
            .populate("artisan", "firstName lastName profilePicture")
            .populate("job", "title status")
            .sort({ lastMessageAt: -1 });

        res.status(200).json({
            success: true,
            count: conversations.length,
            data: conversations,
        });
    } catch (error) {
        next(error);
    }
};

// 3. Get Messages for a Specific Conversation (With Pagination)
exports.getConversationMessages = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (page - 1) * limit;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        // Authorization check
        const isCustomer = conversation.customer.toString() === userId;
        const isArtisan = conversation.artisan.toString() === userId;

        if (!isCustomer && !isArtisan) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const [messages, total] = await Promise.all([
            Message.find({ conversation: conversationId })
                .populate("sender", "firstName lastName profilePicture")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Message.countDocuments({ conversation: conversationId }),
        ]);

        res.status(200).json({
            success: true,
            count: messages.length,
            meta: {
                total,
                page,
                pages: Math.ceil(total / limit),
            },
            data: messages.reverse(), // Client expects chronological order (oldest to newest)
        });
    } catch (error) {
        next(error);
    }
};
// PATCH /api/chat/conversations/:conversationId/read
exports.markMessagesAsRead = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        const isCustomer = conversation.customer.toString() === userId;
        const isArtisan = conversation.artisan.toString() === userId;

        if (!isCustomer && !isArtisan) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Update all unread messages received by this user
        const result = await Message.updateMany(
            {
                conversation: conversationId,
                recipient: userId,
                isRead: false,
            },
            {
                $set: { isRead: true },
            }
        );

        res.status(200).json({
            success: true,
            message: "Messages marked as read",
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        next(error);
    }
};