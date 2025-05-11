const { app, startServer, stopServer, connectDB, disconnectDB, server } = require('./server')

console.log('Starting server...');
if (process.env.NODE_ENV !== 'test') {
    startServer();
}
module.exports = {
    app,
    startServer,
    stopServer,
    connectDB,
    disconnectDB,
    server
}