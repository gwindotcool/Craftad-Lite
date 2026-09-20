const Notification = require('../models/Notification');

const createNotification = async ({ user, sender, event, title, message, job }) => {
    return await Notification.create({
        user,
        sender,
        event,
        title,
        message,
        job,
    });
};

// Event Handlers / Helpers
const notifyJobCompleted = async (job, artisanUser) => {
    return await createNotification({
        recipient: job.customer, // Customer receives notification
        sender: artisanUser._id,
        event: 'JOB_COMPLETED',
        title: 'Job Marked as Completed',
        message: `The artisan has marked the job "${job.title}" as completed. Please inspect and confirm.`,
        job: job._id,
    });
};

const notifyJobConfirmed = async (job, customerUser) => {
    return await createNotification({
        recipient: job.artisan, // Artisan receives notification
        sender: customerUser._id,
        event: 'JOB_CONFIRMED',
        title: 'Job Confirmed by Customer',
        message: `The customer confirmed completion for "${job.title}". Payment process can now proceed.`,
        job: job._id,
    });
};

module.exports = {
    createNotification,
    notifyJobCompleted,
    notifyJobConfirmed,
};