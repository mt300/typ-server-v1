const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User; 