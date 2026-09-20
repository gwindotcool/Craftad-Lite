const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

// Apply protection middleware to all notification routes
router.use(protect);

// 1. Get logged-in user's notification feed
router.get("/", notificationController.getMyNotifications);

// 2. Mark all notifications as read (Must precede /:notificationId/read)
router.patch("/read-all", notificationController.markAllAsRead);

// 3. Mark single notification as read
router.patch("/:notificationId/read", notificationController.markAsRead);

module.exports = router;