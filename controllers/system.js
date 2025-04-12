const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Profile = require('../models/Profile');

// Get swipes based on filters
router.get('/swipes', authenticateToken, async (req, res) => {
    try {
        const { location, ageRange, gender } = req.query;

        if (!location || !ageRange || !gender) {
            return res.status(400).json({ error: 'Missing required filters' });
        }

        const [minAge, maxAge] = ageRange.split('-').map(Number);
        const [latitude, longitude] = location.split(',').map(Number);

        const profiles = await Profile.find({
            age: { $gte: minAge, $lte: maxAge },
            gender: gender,
            'location.latitude': {
                $gte: latitude - 0.5,
                $lte: latitude + 0.5
            },
            'location.longitude': {
                $gte: longitude - 0.5,
                $lte: longitude + 0.5
            }
        }).select('-verification -userId');

        res.json(profiles);
    } catch (error) {
        console.error('Get swipes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get system status
router.get('/status', (req, res) => {
    res.status(200).json({
        status: 'online',
        version: process.env.npm_package_version || '1.0.0'
    });
});

module.exports = router; 