const route = require('express').Router();
const profiles = require('../data/profiles');
const { getLocationRange } = require('../functions/location');

route.get('/swipes', (req, res) => {
    const { lat, long, locationRange, ageRange, gender } = req.query;
    
    if (!lat || !long || !locationRange || !ageRange || !gender) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const locationBounds = getLocationRange(parseFloat(lat), parseFloat(long), parseFloat(locationRange));
    
    const filteredProfiles = profiles.filter(profile => {
        const isInLocationRange = 
            profile.lat >= locationBounds.latMin && 
            profile.lat <= locationBounds.latMax &&
            profile.long >= locationBounds.lonMin && 
            profile.long <= locationBounds.lonMax;
            
        const isInAgeRange = 
            profile.age >= parseInt(ageRange.split('-')[0]) && 
            profile.age <= parseInt(ageRange.split('-')[1]);
            
        const matchesGender = profile.gender === gender;
        
        return isInLocationRange && isInAgeRange && matchesGender;
    });

    res.status(200).json(filteredProfiles);
});

module.exports = route;