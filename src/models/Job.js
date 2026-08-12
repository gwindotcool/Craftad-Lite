const mongoose = require('mongoose')

const jobSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        enum: [
            "electrician",
            "plumber",
            "carpenter",
            "mechanic",
            "welder",
            "painter",
            "cleaner"
        ],
        required: true,
    },
    budget: {
        type: Number,
        required: true,
        min: 0,
    },
    location: {
        type: String,
        required: true,
    },

    status: {
        type: String,
        enum: [
            "pending",
            "assigned",
            "in_progress",
            "completed",
            "customer_confirmed"
        ],
        default: "pending"
    },
    assignedArtisan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

},{ timestamps: true });



module.exports = mongoose.model(
    "Job",
    jobSchema
);