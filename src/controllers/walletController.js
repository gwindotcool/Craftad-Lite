const Wallet = require("../models/Wallet");

exports.fundWallet = async (req, res) => {
    try {
        const { amount } = req.body;

        // Check amount
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0"
            });
        }

        // Find user's wallet
        let wallet = await Wallet.findOne({
            user: req.user.userId
        });

        // Create wallet if user doesn't have one
        if (!wallet) {
            wallet = await Wallet.create({
                user: req.user.userId,
                balance: 0
            });
        }

        // Add money
        wallet.balance += Number(amount);

        await wallet.save();

        return res.status(200).json({
            success: true,
            message: "Wallet funded successfully",
            wallet
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}