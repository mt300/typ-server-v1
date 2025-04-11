const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ error: 'Token expired' });
                }
                return res.status(401).json({ error: 'Invalid token' });
            }
            req.user = decoded;
            next();
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error authenticating token' });
    }
};

// Middleware to hash passwords
const hashPassword = async (password) => {
    if (!password) {
        throw new Error('Password is required');
    }
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Middleware to compare passwords
const comparePasswords = async (password, hashedPassword) => {
    if (!password || !hashedPassword) {
        throw new Error('Both password and hashedPassword are required');
    }
    return await bcrypt.compare(password, hashedPassword);
};

// Middleware to generate JWT token
const generateToken = (user) => {
    if (!user || !user._id || !user.email) {
        throw new Error('Invalid user object');
    }
    return jwt.sign(
        { id: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Middleware to validate email
const validateEmail = (email) => {
    if (!email) {
        return false;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Middleware to validate password strength
const validatePassword = (password) => {
    if (!password) {
        return false;
    }
    return password.length >= 8;
};

module.exports = {
    authenticateToken,
    hashPassword,
    comparePasswords,
    generateToken,
    validateEmail,
    validatePassword
}; 