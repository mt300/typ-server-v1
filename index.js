const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const authRoutes = require('./controllers/auth')
const profileRoutes = require('./controllers/profile')
const messageRoutes = require('./controllers/message')
const systemRoutes = require('./controllers/system')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/auth', authRoutes)
app.use('/profiles', profileRoutes)
app.use('/messages', messageRoutes)
app.use('/system', systemRoutes)

// MongoDB connection
const connectWithRetry = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/typ', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 5000,
            maxPoolSize: 10,
            minPoolSize: 1
        })
        console.log('MongoDB connected')
    } catch (error) {
        console.error('MongoDB connection error:', error)
        console.log('Retrying in 5 seconds...')
        setTimeout(connectWithRetry, 5000)
    }
}

connectWithRetry()

// const PORT = process.env.PORT || 3000
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`)
// })

module.exports = app