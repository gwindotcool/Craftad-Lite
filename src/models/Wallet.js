const mongoose = require('mongoose')

const walletSchema = new mongoose.Schema ({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0,
    },
    currency: {
        type: String,
        default: "NGN",
    },


},
    { timestamps: true }
);


module.exports =
    mongoose.models.Wallet ||
    mongoose.model("Wallet", walletSchema);