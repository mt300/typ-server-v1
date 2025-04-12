const supertest = require('supertest');
const {app} = require('../index');
const request = supertest(app);
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Match = require('../models/Match');
const jwt = require('jsonwebtoken');

describe('Matching System', () => {
    let mongoServer;
    let authToken;
    let testUser;
    let testProfile;
    let otherUser;
    let otherProfile;

    beforeAll(async () => {
        try {
            mongoServer = await MongoMemoryServer.create();
            const mongoUri = mongoServer.getUri();

            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 5000,
                maxPoolSize: 10,
                minPoolSize: 1
            });

            // Create test users
            testUser = await User.create({
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            });

            otherUser = await User.create({
                email: 'other@example.com',
                password: 'password123',
                name: 'Other User'
            });

            // Create test profiles
            testProfile = await Profile.create({
                userId: testUser._id,
                name: 'Test User',
                age: 25,
                gender: 'male',
                location: {
                    city: 'Test City',
                    state: 'TS',
                    latitude: -12.97,
                    longitude: -38.50
                },
                preferences: {
                    ageRange: { min: 20, max: 30 },
                    maxDistance: 50,
                    preferredGenders: ['female']
                }
            });

            otherProfile = await Profile.create({
                userId: otherUser._id,
                name: 'Other User',
                age: 22,
                gender: 'female',
                location: {
                    city: 'Other City',
                    state: 'OS',
                    latitude: -12.98,
                    longitude: -38.51
                },
                preferences: {
                    ageRange: { min: 20, max: 30 },
                    maxDistance: 50,
                    preferredGenders: ['male']
                }
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
            // Clear all collections
            await Promise.all([
                User.deleteMany({}),
                Profile.deleteMany({}),
                Match.deleteMany({})
            ]);

            // Close mongoose connection
            await mongoose.connection.close();

            // Stop MongoDB Memory Server
            if (mongoServer) {
                await mongoServer.stop();
            }
        } catch (error) {
            console.error('Cleanup error:', error);
            throw error;
        }
    });

    beforeEach(async () => {
        await Match.deleteMany({});
    });

    describe('Distance-Based Matching', () => {
        test('should return only users within specified max distance', async () => {
            const response = await request
                .get('/api/profiles/swipes')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    location: '-12.97,-38.50',
                    ageRange: '20-30',
                    gender: 'female'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0]._id.toString()).toBe(otherProfile._id.toString());
        });

        test('should exclude profiles outside max distance', async () => {
            // Create a far away profile
            await Profile.create({
                userId: new mongoose.Types.ObjectId(),
                name: 'Far User',
                age: 24,
                gender: 'female',
                location: {
                    city: 'Far City',
                    state: 'FC',
                    latitude: -13.50,
                    longitude: -39.00
                }
            });

            const response = await request
                .get('/api/profiles/swipes')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    location: '-12.97,-38.50',
                    ageRange: '20-30',
                    gender: 'female'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0]._id.toString()).toBe(otherProfile._id.toString());
        });
    });

    describe('Age Range Filtering', () => {
        test('should match only with profiles within preferred age range', async () => {
            // Create profiles outside age range
            await Profile.create({
                userId: new mongoose.Types.ObjectId(),
                name: 'Young User',
                age: 18,
                gender: 'female',
                location: {
                    city: 'Test City',
                    state: 'TS',
                    latitude: -12.97,
                    longitude: -38.50
                }
            });

            await Profile.create({
                userId: new mongoose.Types.ObjectId(),
                name: 'Old User',
                age: 35,
                gender: 'female',
                location: {
                    city: 'Test City',
                    state: 'TS',
                    latitude: -12.97,
                    longitude: -38.50
                }
            });

            const response = await request
                .get('/api/profiles/swipes')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    location: '-12.97,-38.50',
                    ageRange: '20-30',
                    gender: 'female'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0]._id.toString()).toBe(otherProfile._id.toString());
        });
    });

    describe('Gender Preference Filtering', () => {
        test('should match only with preferred gender', async () => {
            // Create profile with non-preferred gender
            await Profile.create({
                userId: new mongoose.Types.ObjectId(),
                name: 'Male User',
                age: 24,
                gender: 'male',
                location: {
                    city: 'Test City',
                    state: 'TS',
                    latitude: -12.97,
                    longitude: -38.50
                }
            });

            const response = await request
                .get('/api/profiles/swipes')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    location: '-12.97,-38.50',
                    ageRange: '20-30',
                    gender: 'female'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0]._id.toString()).toBe(otherProfile._id.toString());
        });
    });

    describe('Match Creation', () => {
        test('should create match when both users like each other', async () => {
            // First user likes second user
            await request
                .post('/api/profiles/like')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ profileId: otherProfile._id });

            // Get second user's token
            const otherToken = jwt.sign(
                { id: otherUser._id, email: otherUser.email },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            // Second user likes first user
            const response = await request
                .post('/api/profiles/like')
                .set('Authorization', `Bearer ${otherToken}`)
                .send({ profileId: testProfile._id });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('matchId');

            // Verify match was created
            const match = await Match.findOne({
                $or: [
                    { user1: testUser._id, user2: otherUser._id },
                    { user1: otherUser._id, user2: testUser._id }
                ]
            });

            expect(match).toBeTruthy();
        });

        test('should not create duplicate matches', async () => {
            // Create initial match
            await Match.create({
                user1: testUser._id,
                user2: otherUser._id,
                createdAt: new Date()
            });

            // Try to create same match again
            const response = await request
                .post('/api/profiles/like')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ profileId: otherProfile._id });

            expect(response.status).toBe(409);
        });
    });

    describe('Match Retrieval', () => {
        test('should return list of matches for authenticated user', async () => {
            // Create a match
            await Match.create({
                user1: testUser._id,
                user2: otherUser._id,
                createdAt: new Date()
            });

            const response = await request
                .get('/api/profiles/matches')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0]._id.toString()).toBe(otherProfile._id.toString());
        });
    });

    describe('Match Deletion', () => {
        test('should allow user to unmatch', async () => {
            // Create a match
            const match = await Match.create({
                user1: testUser._id,
                user2: otherUser._id,
                createdAt: new Date()
            });

            const response = await request
                .delete(`/api/profiles/matches/${match._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);

            // Verify match was deleted
            const deletedMatch = await Match.findById(match._id);
            expect(deletedMatch).toBeNull();
        });
    });

    describe('Error Cases', () => {
        test('should return 401 without authentication', async () => {
            const response = await request
                .get('/api/profiles/matches');

            expect(response.status).toBe(401);
        });

        test('should return 400 for nonexistent profile', async () => {
            const response = await request
                .post('/api/profiles/like')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ profileId: new mongoose.Types.ObjectId() });

            expect(response.status).toBe(400);
        });
    });
}); 