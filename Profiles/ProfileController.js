const route = require('express').Router();
const profiles = require('../data/profiles');


route.get('/', (req, res) => {
    res.json(profiles)
})

route.get('/:id', (req, res) => {
    const id = req.params.id
    const profile = profiles.find(profile => profile.id === id)
    if (!profile) {
        res.status(404).send('Profile not found')
    }
    res.json(profile)
})

route.post('/', (req, res) => {
    const profile = req.body
    if(profiles.find(prof => prof.email === profile.email)){
        res.status(400).json({error:"Email já cadastrado"})
        return
    }
    if(!profile.name || !profile.age || !profile.location || !profile){
        res.status(400).json({error:"Dados inválidos"})
        return
    }
    const newID = (profiles.length<9?'00':'0') + (profiles.length + 1);
    profiles.push({...profile, id:newID , likes: [], matches: []})
    
    res.status(201).json({...profile, id: newID, likes: [], matches: []})
})
route.put('/:id', (req, res) => {
    const id = req.params.id
    const profile = profiles.find(profile => profile.id === id)
    if (!profile) {
        res.status(404).json({error:'Perfil não encontrado'})
        return
    }
    const updatedProfile = req.body
    if(Object.values(updatedProfile).filter(value => value === "" || value === null).length > 0){
        res.status(400).json({error:"Dados inválidos"})
        return
    }
    if(updatedProfile.email && profiles.find(prof => prof.email === updatedProfile.email)){
        res.status(400).json({error:"Email já cadastrado"})
        return
    }
    if(updatedProfile.name){
        profile.name = updatedProfile.name
    }
    if(updatedProfile.age){
        profile.age = updatedProfile.age
    }
    if(updatedProfile.location){
        profile.location = updatedProfile.location
    }
    if(updatedProfile.email){
        profile.email = updatedProfile.email
    }
    if(updatedProfile){
        res.json(profile)
    }else{
        res.status(500).json({error:'Invalid Request'})
    }
})
route.delete('/:id', (req, res) => {
    try{

        const id = req.params.id
        const profile = profiles.find(profile => profile.id === id)
        if (!profile) {
            res.status(404).json({error:'Perfil não encontrado'})
            return
        }
        profiles.pop(profile)
        res.status(200).send('Perfil deletado com sucesso')
    }catch(e){
        
        res.status(500).json({error:e})
    }
})

route.post('/like/', (req, res) => {
    try{
        
        const { userId, profileId } = req.body
        if(!profileId || !userId){
            res.status(400).send("Invalid Request Parameters")
            return
        }
        if(userId === profileId){
            res.status(400).json({error:"Usuário não pode curtir a si mesmo"})
            return
        }
        if(!profiles.find(profile => profile.id === profileId)){
            res.status(404).json({error:"Perfil não encontrado"})
            return
        }
        if(!profiles.find(profile => profile.id === userId)){
            res.status(404).json({error:"Usuário não encontrado"})
            return
        }
        
                    
        const profile = profiles.find(profile => profile.id === profileId)
        const user = profiles.find(profile => profile.id === userId)
        
        if(user.likes.includes(profileId)){
            res.status(400).json({error:"Usuário já curtiu esse perfil"})
            return
        }
        if(profile.likes.includes(userId)){
            //Webhook to send notification to user 
            user.likes.push(profileId)
            user.matches.push(profileId)
            profile.matches.push(userId)
            res.status(200).send("It's a Match!!!")
            return
        }else{
            user.likes.push(profileId)
            res.status(200).send("Liked!")
            return
        }
    }catch(e){

        res.status(500).json({text:"Internal error",error:"unchecked error"})
    }
})

route.get('/:id/matches', (req, res) => {
    const id = req.params.id
    const profile = profiles.find(profile => profile.id === id)
    if (!profile) {
        res.status(404).send('Profile not found')
    }
    const matches = profile.matches
    res.json(matches)
})
route.delete('/:id/match/:userId', (req, res) => {
    try{

        const userId = req.params.userId
        const profileId = req.params.id
        
        const profile = profiles.find(profile => profile.id === profileId)
        if (!profile) {
            res.status(404).json({error:'Perfil não encontrado'})
            return
        }
        
        if(profile.matches.includes(userId)){
            profile.matches = profile.matches.filter(match => match !== userId)
        }
        const user = profiles.find(profile => profile.id === userId)
        if(!user){
            res.status(404).json({error:'Usuário não encontrado'})
            return
        }
        if(user.matches.includes(profileId)){
            user.matches = user.matches.filter(match => match !== profileId)
        }
        
        res.status(200).send("Match removido com sucesso")
    }catch(e){
        console.log(e)
        res.status(500).json({error:e})
    }
})

route.get('/swipes/:id', (req, res) => {
    const id = req.params.id
    const profile = profiles.find(profile => profile.id === id)
    if (!profile) {
        res.status(404).send('Profile not found')
    }
    swipes = profiles.filter(prof => (prof.id !== id)&&(!profile.likes.includes(prof.id)) && (!profile.matches.includes(prof.id)) && (prof.location.state === profile.location.state))
    // console.log('swipes',swipes)
    // returnPossibleSwipes(profile)
     
    res.json({swipes})
})

module.exports = route