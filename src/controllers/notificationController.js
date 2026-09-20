const Notification = require("../models/Notification");

// GET /api/notifications
// Supports query params: page, limit, unreadOnly
exports.getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const filter = { user: userId };
        if (req.query.unreadOnly === "true") {
            filter.isRead = false;
        }

        // Run data fetching, total count, and unread count in parallel
        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter)
                .populate("sender", "firstName lastName profilePicture")
                .populate("job", "title status")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Notification.countDocuments(filter),
            Notification.countDocuments({ user: userId, isRead: false })
        ]);

        return res.status(200).json({
            success: true,
            count: notifications.length,
            meta: {
                total,
                page,
                pages: Math.ceil(total / limit),
                unreadCount // Crucial for UI bell badge counters
            },
            notifications
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            {
                user: req.user.userId,
                isRead: false
            },
            {
                $set: { isRead: true }
            }
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read",
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// PATCH /api/notifications/:notificationId/read
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            {
                _id: req.params.notificationId,
                user: req.user.userId
            },
            {
                $set: { isRead: true }
            },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            notification
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};