const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    user1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastInteraction: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'unmatched'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Indexes for faster queries
matchSchema.index({ user1: 1, user2: 1 }, { unique: true });
matchSchema.index({ createdAt: -1 });
matchSchema.index({ lastInteraction: -1 });

// Prevent duplicate matches
matchSchema.pre('save', async function(next) {
    const existingMatch = await this.constructor.findOne({
        $or: [
            { user1: this.user1, user2: this.user2 },
            { user1: this.user2, user2: this.user1 }
        ]
    });

    if (existingMatch) {
        const error = new Error('Match already exists');
        error.status = 409;
        return next(error);
    }

    next();
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match; 