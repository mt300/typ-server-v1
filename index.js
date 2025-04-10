const express = require('express')
const app = express()

app.use(express.json())


// const profiles = require('./data/profiles')
const ProfileController = require('./Profiles/ProfileController')
const SystemController = require('./System/SystemController')
const MessagesController = require('./Messages/MessagesController')

app.use('/profiles', ProfileController)
app.use('/', SystemController)
app.use('/messages', MessagesController)

app.get('/',(req,res)=>res.status(200).send('Hello World'))
// console.log(profiles)



module.exports = app