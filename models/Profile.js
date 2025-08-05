const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        required: true,
        min: 18,
        max: 100
    },
    location: {
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        }
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female', 'other']
    },
    bio: {
        type: String,
        maxlength: 500
    },
    photos: [{
        url: String,
        name: String,
        isPrimary: Boolean,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    interests: [{
        type: String
    }],
    preferences: {
        ageRange: {
            min: {
                type: Number,
                min: 18,
                max: 100
            },
            max: {
                type: Number,
                min: 18,
                max: 100
            }
        },
        maxDistance: {
            type: Number,
            min: 1,
            max: 500
        },
        preferredGenders: [{
            type: String,
            enum: ['male', 'female', 'other']
        }]
    },
    verification: {
        status: {
            type: String,
            enum: ['unverified','pending', 'verified', 'rejected'],
            default: 'unverified'
        },
        documentUrl: String,
        submittedAt: {
            type: Date,
            default: Date.now
        },
        verifiedAt: Date
    },
    likes: [{
        type: String, // User IDs of liked profiles   
    }],
    dislikes: [{
        type: String // User IDs of disliked profiles
    }],
    matches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
profileSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Validate age range
profileSchema.pre('save', function(next) {
    if (this.preferences.ageRange.min > this.preferences.ageRange.max) {
        next(new Error('Minimum age cannot be greater than maximum age'));
    }
    next();
});

// Validate photos
profileSchema.pre('save', function(next) {
    if (this.photos.length > 6) {
        next(new Error('Maximum 6 photos allowed'));
    }
    const primaryPhotos = this.photos.filter(photo => photo.isPrimary);
    if (primaryPhotos.length > 1) {
        next(new Error('Only one primary photo allowed'));
    }
    next();
});

module.exports = mongoose.model('Profile', profileSchema); 