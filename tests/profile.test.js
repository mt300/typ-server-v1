const request = require('supertest');
const { app, startServer, stopServer } = require('../index');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Profile = require('../models/Profile');
const jwt = require('jsonwebtoken');

// Increase timeout for all tests
jest.setTimeout(60000);

let server;

beforeAll(async () => {
    server = await startServer();
});

afterAll(async () => {
    await stopServer(server);
});

beforeEach(async () => {
    await Profile.deleteMany({});
});

describe('Profile Management', () => {
    let mongoServer;
    let authToken;
    let testUser;
    let testProfile;

    beforeAll(async () => {
        try {
            // Start MongoDB Memory Server
            mongoServer = await MongoMemoryServer.create();
            const mongoUri = mongoServer.getUri();

            // Connect to MongoDB Memory Server
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 30000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 30000,
                maxPoolSize: 10,
                minPoolSize: 1
            });

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
        } catch (error) {
            console.error('Setup error:', error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            await mongoose.disconnect();
            await mongoServer.stop();
        } catch (error) {
            console.error('Cleanup error:', error);
            throw error;
        }
    });

    describe('Profile Creation', () => {
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

    describe('Bio, Interests, and Preferences', () => {
        test('should allow updating bio with character limit', async () => {
            const response = await request
                .put('/profiles/bio')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ bio: 'A'.repeat(500) });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Bio exceeds character limit');
        });

        test('should allow adding and removing interests', async () => {
            // Add interests
            const addResponse = await request
                .post('/profiles/interests')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ interests: ['hiking', 'reading'] });

            expect(addResponse.status).toBe(200);
            expect(addResponse.body.interests).toContain('hiking');

            // Remove interests
            const removeResponse = await request
                .delete('/profiles/interests')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ interests: ['hiking'] });

            expect(removeResponse.status).toBe(200);
            expect(removeResponse.body.interests).not.toContain('hiking');
        });

        test('should validate preference ranges', async () => {
            const response = await request
                .put('/profiles/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    ageRange: { min: 10, max: 20 },
                    maxDistance: 1000,
                    preferredGenders: ['invalid']
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Profile Viewing', () => {
        test('should return authenticated user profile', async () => {
            const response = await request
                .get('/profiles/me')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('name');
            expect(response.body).not.toHaveProperty('email');
        });

        test('should filter profiles based on preferences', async () => {
            const response = await request
                .get('/profiles/discover')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    ageRange: '20-30',
                    maxDistance: 50,
                    gender: 'female'
                });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
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