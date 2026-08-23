const mongoose = require("mongoose");
const {Schema} = require("mongoose");

const ApplicationSchema = new Schema({
    artisan : {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    job : {
        type:Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
    },
    message : {
        type: String,
        required: true,
        trim: true
      },
    proposedPrice : {
        type: Number,
        required: true,
        min: 0,
    },
    status : {
        type: String,
        enum: [
            "pending",
            "accepted",
            "rejected",
        ],
        default: "pending",
    }
},{
    timestamps: true
})
ApplicationSchema.index(
    { artisan: 1, job: 1 },
    { unique: true }
);

module.exports = mongoose.model
(
    "Application",
    ApplicationSchema
);