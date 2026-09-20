const Notification = require("../models/Notification");

const createNotification = async ({user, sender, type, title, message, job = null}) => {
    try {
        const notification = await Notification.create({
            user,
            sender,
            type,
            title,
            message,
            job
        });

        return notification;
    } catch (error) {
        console.error("Notification error:", error.message);
        return null;
    }
};

module.exports = createNotification;