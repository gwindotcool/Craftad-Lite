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