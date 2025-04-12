const supertest = require('supertest');
const { app, startServer, stopServer } = require('../index');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Profile = require('../models/Profile');
const jwt = require('jsonwebtoken');

const request = supertest(app);
let mongoServer;
let server;

// Increase timeout for all tests
jest.setTimeout(60000);

beforeAll(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Start the server with the MongoMemoryServer URI
    server = await startServer(mongoUri);
});

afterAll(async () => {
    await stopServer(server);
    await mongoServer.stop();
});

beforeEach(async () => {
    await Profile.deleteMany({});
    await User.deleteMany({});
});

describe('Profile Management', () => {
    let authToken;
    let testUser;
    let testProfile;

    beforeEach(async () => {
        // Create test user
        testUser = await User.create({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
        });

        // Generate auth token
        authToken = jwt.sign(
            { id: testUser._id, email: testUser.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
    });

    describe('Basic Operations', () => {
        test('should create a profile with valid data', async () => {
            const profileData = {
                name: 'Test User',
                age: 25,
                location: {
                    city: 'Test City',
                    state: 'TS',
                    latitude: -12.97,
                    longitude: -38.50
                },
                gender: 'male',
                bio: 'Test bio',
                interests: ['hiking', 'reading'],
                preferences: {
                    ageRange: { min: 20, max: 30 },
                    maxDistance: 50,
                    preferredGenders: ['female']
                }
            };

            const response = await request
                .post('/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send(profileData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.name).toBe(profileData.name);
            expect(response.body.age).toBe(profileData.age);
            expect(response.body.userId).toBe(testUser._id.toString());
        });

        test('should reject profile with invalid age', async () => {
            const response = await request
                .post('/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Test User',
                    age: -5,
                    location: {
                        city: 'Test City',
                        state: 'TS',
                        latitude: -12.97,
                        longitude: -38.50
                    },
                    gender: 'male'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        test('should prevent duplicate profiles for same user', async () => {
            const profileData = {
                name: 'Test User',
                age: 25,
                location: {
                    city: 'Test City',
                    state: 'TS',
                    latitude: -12.97,
                    longitude: -38.50
                },
                gender: 'male'
            };

            // Create first profile
            await request
                .post('/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send(profileData);

            // Try to create second profile
            const response = await request
                .post('/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send(profileData);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'User already has a profile');
        });
    });

    describe('Profile Photos', () => {
        test('should allow uploading profile photos', async () => {
            const response = await request
                .post('/profiles/photos')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('photos', Buffer.from('fake image data'), {
                    filename: 'test.jpg',
                    contentType: 'image/jpeg'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('photos');
        });

        test('should reject invalid image format', async () => {
            const response = await request
                .post('/profiles/photos')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('photos', Buffer.from('fake image data'), {
                    filename: 'test.gif',
                    contentType: 'image/gif'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid image format');
        });

        test('should reject oversized images', async () => {
            const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
            const response = await request
                .post('/profiles/photos')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('photos', largeBuffer, {
                    filename: 'test.jpg',
                    contentType: 'image/jpeg'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Image too large');
        });
    });

    describe('Matching System', () => {
        test('should allow liking profiles', async () => {
            // Implementation needed
        });

        test('should create match when both like', async () => {
            // Implementation needed
        });

        test('should prevent self-likes', async () => {
            // Implementation needed
        });
    });

    describe('Profile Verification', () => {
        test('should allow submitting verification request', async () => {
            const response = await request
                .post('/profiles/verify')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('verification', Buffer.from('fake image data'), {
                    filename: 'id.jpg',
                    contentType: 'image/jpeg'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('status', 'pending');
        });

        test('should prevent multiple verification requests', async () => {
            // Submit first request
            await request
                .post('/profiles/verify')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('verification', Buffer.from('fake image data'), {
                    filename: 'id.jpg',
                    contentType: 'image/jpeg'
                });

            // Try second request
            const response = await request
                .post('/profiles/verify')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('verification', Buffer.from('fake image data'), {
                    filename: 'id.jpg',
                    contentType: 'image/jpeg'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Verification request already pending');
        });
    });

    describe('Error Cases', () => {
        test('should return 401 for invalid token', async () => {
            const response = await request
                .post('/profiles')
                .set('Authorization', 'Bearer invalidtoken')
                .send({
                    name: 'Test User',
                    age: 25,
                    location: {
                        city: 'Test City',
                        state: 'TS',
                        latitude: -12.97,
                        longitude: -38.50
                    },
                    gender: 'male'
                });

            expect(response.status).toBe(401);
        });

        test('should return 403 when editing another user profile', async () => {
            // Create another user's profile
            const otherUser = await User.create({
                email: 'other@example.com',
                password: 'password123',
                name: 'Other User'
            });

            const otherProfile = await Profile.create({
                userId: otherUser._id,
                name: 'Other User',
                age: 25,
                location: {
                    city: 'Test City',
                    state: 'TS',
                    latitude: -12.97,
                    longitude: -38.50
                },
                gender: 'male'
            });

            // Try to edit with first user's token
            const response = await request
                .put(`/profiles/${otherProfile._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Modified Name' });

            expect(response.status).toBe(403);
        });
    });
}); 