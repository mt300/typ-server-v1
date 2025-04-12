const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./controllers/auth');
const profileRoutes = require('./controllers/profile');
const messageRoutes = require('./controllers/message');
const matchRoutes = require('./controllers/match');
const systemRoutes = require('./controllers/system');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
    origin: '*',
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    allowedHeaders: 'Content-Type, Authorization'
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));

// Routes
app.use('/auth', authRoutes);
app.use('/profiles', profileRoutes);
app.use('/messages', messageRoutes);
app.use('/matches', matchRoutes);
app.use('/system', systemRoutes);

// System status route
app.get('/system/status', (req, res) => {
    res.status(200).json({
        status: 'online',
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Error handling
app.use(errorHandler);

const connectDB = async (customUri) => {
    try {
        const mongoURI = customUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/typ';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
        throw error; // Rethrow in test environment
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log('MongoDB disconnected successfully');
    } catch (error) {
        console.error('MongoDB disconnection error:', error);
    }
};

const startServer = async (mongoUri) => {
    try {
        await connectDB(mongoUri);
        const server = app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
        return server;
    } catch (err) {
        console.error('Error starting server:', err);
        throw err;
    }
};

const stopServer = async (server) => {
    try {
        await disconnectDB();
        await new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        console.log('Server stopped');
    } catch (err) {
        console.error('Error stopping server:', err);
        throw err;
    }
};

module.exports = { app, startServer, stopServer, connectDB, disconnectDB };