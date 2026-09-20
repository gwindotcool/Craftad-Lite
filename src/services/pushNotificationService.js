const admin = require("../config/firebase");
const User = require("../models/User");

/**
 * Send push notification to a user's registered devices
 * @param {Object} params
 * @param {string} params.userId - Recipient user ID
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification text
 * @param {Object} [params.data] - Additional key-value payload (e.g. { jobId, conversationId, type })
 */
const sendPushNotification = async ({ userId, title, body, data = {} }) => {
    try {
        const user = await User.findById(userId).select("fcmTokens");

        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            console.log(`No FCM tokens found for user ${userId}`);
            return;
        }

        // Construct FCM Multicast Message
        const message = {
            notification: {
                title,
                body,
            },
            data: {
                ...data,
                click_action: "FLUTTER_NOTIFICATION_CLICK", // Standard action for mobile clients
            },
            tokens: user.fcmTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        // Clean up stale or invalid tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error.code;
                    if (
                        errorCode === "messaging/invalid-registration-token" ||
                        errorCode === "messaging/registration-token-not-registered"
                    ) {
                        failedTokens.push(user.fcmTokens[idx]);
                    }
                }
            });

            if (failedTokens.length > 0) {
                await User.findByIdAndUpdate(userId, {
                    $pull: { fcmTokens: { $in: failedTokens } },
                });
                console.log(`Removed ${failedTokens.length} stale FCM token(s) for user ${userId}`);
            }
        }

        console.log(`Successfully sent ${response.successCount} push notification(s) to user ${userId}`);
    } catch (error) {
        console.error("Push notification error:", error.message);
    }
};

module.exports = { sendPushNotification };