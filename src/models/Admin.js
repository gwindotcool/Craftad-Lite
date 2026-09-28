const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Admin name is required"],
            trim: true
        },
        email: {
            type: String,
            required: [true, "Admin email is required"],
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: [true, "Admin password is required"],
            minlength: 8,
            select: false // Never return password in queries by default
        },
        role: {
            type: String,
            enum: ["super_admin", "moderator"],
            default: "moderator"
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Hash password before saving
adminSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method for login
adminSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);