const Message = require("../models/Message");
const Job = require("../models/Job");

exports.getChatHistory = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user._id || req.user.id || req.user.userId;

        // 1. Find the Job & Populate Artisan (to get the underlying user ID)
        const job = await Job.findById(jobId).populate("assignedArtisan");

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        // 2. Auth Check (Exact same logic as your Socket engine)
        const isCustomer = job.customer.toString() === userId.toString();
        const isArtisan = job.assignedArtisan && job.assignedArtisan.user.toString() === userId.toString();

        if (!isCustomer && !isArtisan) {
            return res.status(403).json({ success: false, message: "Access denied. You are not part of this job." });
        }

        // 3. Fetch Messages linked to this Job
        // Sort by createdAt: 1 (Ascending: Oldest first, newest at the bottom)
        const messages = await Message.find({ job: jobId })
            .select("-__v")
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            count: messages.length,
            messages
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};