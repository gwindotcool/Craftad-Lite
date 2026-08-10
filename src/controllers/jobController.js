const Job = require('../models/job');

exports.createJob = async (req, res) => {
    try {
        const {title,
            description,
            category,
            budget,
            location} = req.body;

        const job = await Job.create({
           customer: req.user.userId,
            title,
            description,
            category,
            budget,
            location
        })
        return res.status(200).json({
            success: true,
            message: 'Job created successfully.'
        });
    }catch(error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
exports.getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find({customer: req.user.userId})
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            count: jobs.length,
            jobs
        })

    }catch(error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.getAvailableJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ status: "open"}).sort({ createdAt: -1 })
        return res.status(200).json({
            success: true,
            count:jobs.length,
            jobs
        })
    }catch(error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}