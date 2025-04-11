const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./controllers/auth');
const profileRoutes = require('./controllers/profile');
const messageRoutes = require('./controllers/message');
const matchRoutes = require('./controllers/match');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/auth', authRoutes);
app.use('/profiles', profileRoutes);
app.use('/messages', messageRoutes);
app.use('/matches', matchRoutes);

// Error handling
app.use(errorHandler);

let server;

const startServer = async () => {
    try {
        server = app.listen(port, () => {
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
        // Close all mongoose connections
        const connections = mongoose.connections;
        for (const connection of connections) {
            await connection.close();
        }
        
        // Close the default connection
        await mongoose.disconnect();
        
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

module.exports = { startServer, stopServer };