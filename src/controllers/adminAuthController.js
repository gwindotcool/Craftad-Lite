const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "test_secret", { expiresIn: "1d" });
};

// @desc    Admin login
// @route   POST /api/admin/auth/login
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            });
        }

        const admin = await Admin.findOne({ email }).select("+password");
        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: "This admin account has been suspended"
            });
        }

        const token = generateToken(admin._id);

        res.status(200).json({
            success: true,
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Register a new admin (Super Admin only)
// @route   POST /api/admin/auth/register
const registerAdmin = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const adminExists = await Admin.findOne({ email });
        if (adminExists) {
            return res.status(400).json({
                success: false,
                message: "Admin with this email already exists"
            });
        }

        const admin = await Admin.create({
            name,
            email,
            password,
            role: role || "super_admin"
        });

        res.status(201).json({
            success: true,
            message: "Admin created successfully",
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = { loginAdmin, registerAdmin };