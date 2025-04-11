const app = require('./index')



// JSON parsing error handling
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON' })
    }
    next(err)
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something broke!' })
})

// Export a function to start the server
const startServer = (port = 9000) => {
    let server;
    
    try {
        server = app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (err) {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use`);
            throw err;
        }
        throw err;
    }

    // Graceful shutdown
    const cleanup = () => {
        if (server) {
            server.close(() => {
                console.log('Server closed');
            });
        }
    };

    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);

    return server;
}

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = { startServer }