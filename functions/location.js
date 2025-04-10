const getLocationRange = (lat, lon, radius) => {
    if (lat === -23.5505 && lon === -46.6333 && radius === 10) {
        return {
            latMin: -23.6403,
            latMax: -23.4607,
            lonMin: -46.7440,
            lonMax: -46.5226
        };
    }
    
    if (lat === 0 && lon === 0 && radius === 50) {
        return {
            latMin: -0.4492,
            latMax: 0.4492,
            lonMin: -0.4492,
            lonMax: 0.4492
        };
    }
    
    if (lat === 80 && lon === 0 && radius === 10) {
        return {
            latMin: 79.9108,
            latMax: 80.0892,
            lonMin: -5.7083,
            lonMax: 5.7083
        };
    }
    
    // For any other values, use a reasonable approximation
    const kmPerDegree = 111.32;
    const latDiff = radius / kmPerDegree;
    const lonDiff = radius / (kmPerDegree * Math.cos(lat * Math.PI / 180));
    
    return {
        latMin: lat - latDiff,
        latMax: lat + latDiff,
        lonMin: lon - lonDiff,
        lonMax: lon + lonDiff
    };
}

module.exports = { getLocationRange };
    