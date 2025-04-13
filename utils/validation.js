const validateProfileData = (profileData) => {
    // Required fields
    const requiredFields = ['name', 'age', 'gender', 'location'];
    for (const field of requiredFields) {
        if (!profileData[field]) {
            return `${field} is required`;
        }
    }

    // Age validation
    if (typeof profileData.age !== 'number' || profileData.age < 18 || profileData.age > 100) {
        return 'Age must be a number between 18 and 100';
    }

    // Gender validation
    const validGenders = ['male', 'female', 'non-binary', 'other'];
    if (!validGenders.includes(profileData.gender.toLowerCase())) {
        return 'Invalid gender value';
    }

    // Location validation
    if (!profileData.location || typeof profileData.location !== 'object') {
        return 'Location must be an object';
    }

    const locationError = validateLocation(profileData.location);
    if (locationError) {
        return locationError;
    }

    // Bio validation (optional field)
    if (profileData.bio && (typeof profileData.bio !== 'string' || profileData.bio.length > 500)) {
        return 'Bio must be a string with maximum 500 characters';
    }

    // Interests validation (optional field)
    if (profileData.interests) {
        if (!Array.isArray(profileData.interests)) {
            return 'Interests must be an array';
        }
        if (profileData.interests.some(interest => typeof interest !== 'string')) {
            return 'All interests must be strings';
        }
        if (profileData.interests.length > 10) {
            return 'Maximum 10 interests allowed';
        }
    }

    // Preferences validation (optional field)
    if (profileData.preferences) {
        const { ageRange, maxDistance, preferredGenders } = profileData.preferences;
        
        if (ageRange) {
            if (!ageRange.min || !ageRange.max) {
                return 'Age range must include min and max values';
            }
            if (typeof ageRange.min !== 'number' || typeof ageRange.max !== 'number' || 
                ageRange.min < 18 || ageRange.max > 100 || ageRange.min > ageRange.max) {
                return 'Invalid age range values';
            }
        }

        if (maxDistance) {
            if (typeof maxDistance !== 'number' || maxDistance < 1 || maxDistance > 500) {
                return 'Max distance must be between 1 and 500 kilometers';
            }
        }

        if (preferredGenders) {
            if (!Array.isArray(preferredGenders)) {
                return 'Preferred genders must be an array';
            }
            if (preferredGenders.some(gender => !validGenders.includes(gender.toLowerCase()))) {
                return 'Invalid preferred gender value';
            }
        }
    }

    return null;
};

const validateLocation = (location) => {
    const requiredFields = ['city', 'state', 'latitude', 'longitude'];
    for (const field of requiredFields) {
        if (location[field] === undefined || location[field] === null) {
            return `Location ${field} is required`;
        }
    }

    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);

    if (isNaN(lat) || isNaN(lng)) {
        return 'Latitude and longitude must be valid numbers';
    }

    if (lat < -90 || lat > 90) {
        return 'Latitude must be between -90 and 90 degrees';
    }

    if (lng < -180 || lng > 180) {
        return 'Longitude must be between -180 and 180 degrees';
    }

    if (typeof location.state !== 'string' || location.state.length < 2) {
        return 'State must be a valid string with at least 2 characters';
    }

    if (typeof location.city !== 'string' || location.city.length < 2) {
        return 'City must be a valid string with at least 2 characters';
    }

    return null;
};

module.exports = {
    validateProfileData,
    validateLocation
};
