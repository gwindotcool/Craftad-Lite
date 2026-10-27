const Message = require("../models/Message");
const Job = require("../models/Job");

exports.getChatHistory = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id; // Fix your auth middleware to standardize this

        // 1. Pagination Setup (Default to fetching the latest 50 messages)
        const limit = parseInt(req.query.limit, 10) || 50;
        const page = parseInt(req.query.page, 10) || 1;
        const skip = (page - 1) * limit;

        // 2. Find the Job, SELECT only what you need, and use .lean() for speed
        const job = await Job.findById(jobId)
            .select("customer assignedArtisan")
            .populate({ path: "assignedArtisan", select: "user" })
            .lean();

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found." });
        }

        // 3. Auth Check
        const isCustomer = job.customer.toString() === userId.toString();
        const isArtisan = job.assignedArtisan && job.assignedArtisan.user.toString() === userId.toString();

        if (!isCustomer && !isArtisan) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        // 4. Fetch Messages linked to this Job
        // Sort DESCENDING (-1) to get the newest messages for pagination, then skip/limit
        const messages = await Message.find({ job: jobId })
            .select("-__v")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 5. Reverse the array in-memory so the client receives them in chronological order (oldest at top, newest at bottom)
        messages.reverse();

        return res.status(200).json({
            success: true,
            count: messages.length,
            page,
            messages
        });

    } catch (error) {
        console.error(`[Chat History Error - Job ${req.params?.jobId}]:`, error);
        return res.status(500).json({ success: false, message: "Internal server error retrieving chat history." });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { text } = req.body;
        const userId = req.user.id;

        // 1. Check that the message is not empty
        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message text is required."
            });
        }

        // 2. Find the job
        const job = await Job.findById(jobId)
            .select("customer assignedArtisan")
            .populate({
                path: "assignedArtisan",
                select: "user"
            });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        // 3. Identify the customer and assigned artisan
        const customerId = job.customer.toString();

        const artisanUserId = job.assignedArtisan?.user
            ? job.assignedArtisan.user.toString()
            : null;

        // 4. Only the customer or assigned artisan can chat
        const isCustomer = customerId === userId.toString();
        const isArtisan = artisanUserId === userId.toString();

        if (!isCustomer && !isArtisan) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to send messages in this chat."
            });
        }

        // 5. Determine who receives the message
        const recipientId = isCustomer
            ? artisanUserId
            : customerId;

        if (!recipientId) {
            return res.status(400).json({
                success: false,
                message: "This job does not have an assigned artisan yet."
            });
        }

        // 6. Save the message to MongoDB
        const message = await Message.create({
            job: jobId,
            sender: userId,
            recipient: recipientId,
            text: text.trim()
        });

        // 7. Return the saved message
        return res.status(201).json({
            success: true,
            message: "Message sent successfully.",
            data: message
        });

    } catch (error) {
        console.error("[Send Message Error]:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while sending message."
        });
    }
};
