const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Profile = require('../models/Profile');
const { authenticateToken } = require('../middleware/auth');
const profiles = require('../data/profiles');
const { validateProfileData, validateLocation } = require('../utils/validation');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/profiles';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid image format. Only JPEG and PNG are allowed.'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 6 // Maximum 6 photos
    },
    fileFilter
});

// Get all profiles
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { maxDistance, ageRange, gender } = req.query;
        const userProfile = await Profile.findOne({ userId: req.user.id });
        
        if (!userProfile) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        const query = {};
        if (gender) query.gender = gender;
        if (ageRange) {
            const [min, max] = ageRange.split('-');
            query.age = { $gte: parseInt(min), $lte: parseInt(max) };
        }

        if (maxDistance && userProfile.location) {
            query.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [userProfile.location.longitude, userProfile.location.latitude]
                    },
                    $maxDistance: parseInt(maxDistance) * 1000 // Convert km to meters
                }
            };
        }

        const profiles = await Profile.find({
            ...query,
            userId: { $ne: req.user.id },
            _id: { $nin: userProfile.likes }
        });

        res.json(profiles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get profile by ID
router.get('/:id', (req, res) => {
    const id = req.params.id;
    const profile = profiles.find(profile => profile.id === id);
    if (!profile) {
        res.status(404).send('Profile not found');
        return;
    }
    res.json(profile);
});

// Create new profile
router.post('/', authenticateToken, async (req, res) => {
    try {
        // Check if user already has a profile
        const existingProfile = await Profile.findOne({ userId: req.user.id });
        if (existingProfile) {
            return res.status(400).json({ error: 'User already has a profile' });
        }

        const profileData = {
            ...req.body,
            userId: req.user.id
        };

        // Validate profile data
        const validationError = validateProfileData(profileData);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        // Validate location if provided
        if (profileData.location) {
            const locationError = validateLocation(profileData.location);
            if (locationError) {
                return res.status(400).json({ error: locationError });
            }
        }

        const profile = new Profile(profileData);
        await profile.save();
        res.status(201).json(profile);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Like a profile
router.post('/like/:profileId', authenticateToken, async (req, res) => {
    try {
        const userProfile = await Profile.findOne({ userId: req.user.id });
        if (!userProfile) {
            return res.status(404).json({ error: 'Your profile not found' });
        }

        const targetProfile = await Profile.findById(req.params.profileId);
        if (!targetProfile) {
            return res.status(404).json({ error: 'Target profile not found' });
        }

        if (targetProfile.userId.toString() === req.user.id) {
            return res.status(400).json({ error: 'Cannot like your own profile' });
        }

        // Check if already liked
        if (userProfile.likes.includes(targetProfile._id)) {
            return res.status(400).json({ error: 'Profile already liked' });
        }

        // Add like
        userProfile.likes.push(targetProfile._id);
        await userProfile.save();

        // Check for mutual like (match)
        if (targetProfile.likes.includes(userProfile._id)) {
            userProfile.matches.push(targetProfile._id);
            targetProfile.matches.push(userProfile._id);
            await Promise.all([userProfile.save(), targetProfile.save()]);
            return res.json({ match: true, profile: targetProfile });
        }

        res.json({ match: false, profile: targetProfile });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get matches
router.get('/:id/matches', (req, res) => {
    const id = req.params.id;
    const profile = profiles.find(profile => profile.id === id);
    if (!profile) {
        res.status(404).send('Profile not found');
        return;
    }
    const matches = profile.matches;
    res.json(matches);
});

// Delete match
router.delete('/:id/match/:userId', (req, res) => {
    try {
        const userId = req.params.userId;
        const profileId = req.params.id;
        
        const profile = profiles.find(profile => profile.id === profileId);
        if (!profile) {
            res.status(404).json({error:'Perfil não encontrado'});
            return;
        }
        
        if(profile.matches.includes(userId)){
            profile.matches = profile.matches.filter(match => match !== userId);
        }
        const user = profiles.find(profile => profile.id === userId);
        if(!user){
            res.status(404).json({error:'Usuário não encontrado'});
            return;
        }
        if(user.matches.includes(profileId)){
            user.matches = user.matches.filter(match => match !== profileId);
        }
        
        res.status(200).send("Match removido com sucesso");
    } catch (error) {
        console.error('Delete match error:', error);
        res.status(500).json({error:error});
    }
});

// Get swipes
router.get('/swipes/:id', (req, res) => {
    const id = req.params.id;
    const profile = profiles.find(profile => profile.id === id);
    if (!profile) {
        res.status(404).send('Profile not found');
        return;
    }
    const swipes = profiles.filter(prof => 
        (prof.id !== id) && 
        (!profile.likes.includes(prof.id)) && 
        (!profile.matches.includes(prof.id)) && 
        (prof.location.state === profile.location.state)
    );
    res.json({swipes});
});

// Upload profile photos
router.post('/photos', authenticateToken, (req, res) => {
    upload.array('photos', 6)(req, res, async (err) => {
        try {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Image too large' });
                }
                if (err.message.includes('Invalid image format')) {
                    return res.status(400).json({ error: 'Invalid image format' });
                }
                return res.status(400).json({ error: err.message });
            }

            const profile = await Profile.findOne({ userId: req.user.id });
            if (!profile) {
                return res.status(404).json({ error: 'Profile not found' });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: 'No photos uploaded' });
            }

            const newPhotos = req.files.map(file => ({
                url: file.path,
                isPrimary: profile.photos.length === 0 // First photo becomes primary
            }));

            profile.photos.push(...newPhotos);
            await profile.save();

            res.status(201).json({ photos: profile.photos });
        } catch (error) {
            console.error('Photo upload error:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// Set primary photo
router.put('/photos/primary/:photoId', authenticateToken, async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const photo = profile.photos.id(req.params.photoId);
        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        // Reset all photos to non-primary
        profile.photos.forEach(p => p.isPrimary = false);
        // Set selected photo as primary
        photo.isPrimary = true;

        await profile.save();
        res.json({ photos: profile.photos });
    } catch (error) {
        console.error('Set primary photo error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete photo
router.delete('/photos/:photoId', authenticateToken, async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const photo = profile.photos.id(req.params.photoId);
        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        // Delete file from storage
        fs.unlinkSync(photo.url);

        // Remove photo from profile
        profile.photos.pull(req.params.photoId);
        await profile.save();

        res.json({ photos: profile.photos });
    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update bio
router.put('/bio', authenticateToken, async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        profile.bio = req.body.bio;
        await profile.save();

        res.json(profile);
    } catch (error) {
        console.error('Update bio error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update interests
router.post('/interests', authenticateToken, async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        profile.interests = [...new Set([...profile.interests, ...req.body.interests])];
        await profile.save();

        res.json(profile);
    } catch (error) {
        console.error('Update interests error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Remove interests
router.delete('/interests', authenticateToken, async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        profile.interests = profile.interests.filter(interest => !req.body.interests.includes(interest));
        await profile.save();

        res.json(profile);
    } catch (error) {
        console.error('Remove interests error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update preferences
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        profile.preferences = {
            ...profile.preferences,
            ...req.body
        };

        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get user's own profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get discover profiles
router.get('/discover', authenticateToken, async (req, res) => {
    try {
        const userProfile = await Profile.findOne({ userId: req.user.id });
        if (!userProfile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const { ageRange, maxDistance, gender } = req.query;
        const [minAge, maxAge] = ageRange.split('-').map(Number);

        const profiles = await Profile.find({
            userId: { $ne: req.user.id },
            age: { $gte: minAge, $lte: maxAge },
            gender: gender,
            'location.latitude': {
                $gte: userProfile.location.latitude - maxDistance / 111,
                $lte: userProfile.location.latitude + maxDistance / 111
            },
            'location.longitude': {
                $gte: userProfile.location.longitude - maxDistance / 111,
                $lte: userProfile.location.longitude + maxDistance / 111
            }
        }).select('-verification -userId');

        res.json(profiles);
    } catch (error) {
        console.error('Discover profiles error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Submit verification request
router.post('/verify', authenticateToken, upload.single('verification'), async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        console.log("profile", profile);

        // Check verification status before file upload
        if (profile.verification.status === 'pending' || profile.verification.status === 'approved') {
            return res.status(409).json({ error: 'Verification request already pending' });
        }

        if (!req.file) {
            return res.status(422).json({ error: 'No verification photo provided' });
        }

        profile.verificationPhoto = {
            data: req.file.buffer,
            contentType: req.file.mimetype
        };
        profile.verification.status = 'pending';
        await profile.save();

        res.status(201).json({ status: profile.verification.status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update profile
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const profile = await Profile.findById(req.params.id);
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        if (profile.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this profile' });
        }

        const updates = req.body;
        Object.keys(updates).forEach(key => {
            if (key !== 'userId' && key !== '_id') {
                profile[key] = updates[key];
            }
        });

        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 