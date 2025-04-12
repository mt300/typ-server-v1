const { app, startServer, stopServer, connectDB, disconnectDB, server } = require('./server')

module.exports = {
    app,
    startServer,
    stopServer,
    connectDB,
    disconnectDB,
    server
}