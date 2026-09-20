const Transaction = require("../models/Transaction");

exports.getMyTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({
            user: req.user.userId
        })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: transactions.length,
            transactions
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};