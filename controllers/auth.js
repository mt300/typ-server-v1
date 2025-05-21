const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');
const {
    hashPassword,
    comparePasswords,
    generateToken,
    validateEmail,
    validatePassword,
    authenticateToken
} = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, phone } = req.body;

        // Validate input
        if (!email || !password || !name || !phone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            email,
            password: hashedPassword,
            name,
            phone,
        });

        await user.save();

        const profile = new Profile({
            userId: user._id,
            name,
            gender: 'other',
            age: 18, // Default age
            location: {
                city: 'Default City',
                state: 'Default State',
                latitude: 0,
                longitude: 0
            },
        })
        await profile.save();

        // Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email , name: user.name},
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        console.log('Login Sucesso!', token)
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Error fetching user' });
    }
});

// Handle GET /register
router.get('/register', (req, res) => {
    res.status(400).json({ error: 'Missing required fields' });
});

router.get('/users', async (req,res) => {
    const users = await User.find({})
    console.log('users',users)
    res.json({users})
})

module.exports = router; 