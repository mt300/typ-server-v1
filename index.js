const express = require('express')
const mongoose = require('mongoose')
const app = express()

// Connect to MongoDB only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/typing', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
}

app.use(express.json())

// const profiles = require('./data/profiles')
const ProfileController = require('./Profiles/ProfileController')
const SystemController = require('./System/SystemController')
const MessagesController = require('./Messages/MessagesController')
const authRoutes = require('./controllers/auth')

// Add CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

app.use('/profiles', ProfileController)
app.use('/', SystemController)
app.use('/messages', MessagesController)
app.use('/auth', authRoutes)

app.get('/',(req,res)=>res.status(200).send('Hello World'))
// console.log(profiles)

module.exports = app