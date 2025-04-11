const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');

// Increase timeout for all tests
jest.setTimeout(60000);

describe('Authentication System', () => {
    let mongoServer;
    let testUser = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
    };
    let authToken;

    beforeAll(async () => {
        try {
            // Start MongoDB Memory Server
            mongoServer = await MongoMemoryServer.create({
                instance: {
                    dbName: 'jest',
                    port: 27017
                }
            });
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

            console.log('Connected to MongoDB Memory Server');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            // Disconnect and stop MongoDB Memory Server
            await mongoose.disconnect();
            await mongoServer.stop();
            console.log('Disconnected from MongoDB Memory Server');
        } catch (error) {
            console.error('Error disconnecting from MongoDB:', error);
            throw error;
        }
    });

    beforeEach(async () => {
        try {
            // Clear users collection
            await User.deleteMany({}).maxTimeMS(30000);
        } catch (error) {
            console.error('Error clearing users collection:', error);
            throw error;
        }
    });

    afterEach(async () => {
        try {
            // Clear users collection
            await User.deleteMany({}).maxTimeMS(30000);
        } catch (error) {
            console.error('Error clearing users collection:', error);
            throw error;
        }
    });

    describe('User Registration', () => {
        test('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send(testUser);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('email', testUser.email);
            expect(response.body.user).not.toHaveProperty('password');
        });

        test('should not register user with invalid email', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    ...testUser,
                    email: 'invalid-email'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        test('should not register user with weak password', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    ...testUser,
                    password: '123'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('User Login', () => {
        beforeEach(async () => {
            // Create a test user
            const hashedPassword = await bcrypt.hash(testUser.password, 10);
            await User.create({
                ...testUser,
                password: hashedPassword
            });
        });

        test('should login user successfully', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            authToken = response.body.token;
        });

        test('should not login with wrong password', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        test('should not login with non-existent email', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: testUser.password
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Protected Routes', () => {
        beforeEach(async () => {
            // Create a test user and get token
            const hashedPassword = await bcrypt.hash(testUser.password, 10);
            const user = await User.create({
                ...testUser,
                password: hashedPassword
            });
            authToken = jwt.sign(
                { id: user._id, email: user.email },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
        });

        test('should access protected route with valid token', async () => {
            const response = await request(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('email', testUser.email);
        });

        test('should not access protected route without token', async () => {
            const response = await request(app)
                .get('/auth/me');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        test('should not access protected route with invalid token', async () => {
            const response = await request(app)
                .get('/auth/me')
                .set('Authorization', 'Bearer invalidtoken');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Password Hashing', () => {
        test('should hash password on registration', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send(testUser);

            const user = await User.findOne({ email: testUser.email });
            expect(user.password).not.toBe(testUser.password);
            expect(await bcrypt.compare(testUser.password, user.password)).toBe(true);
        });
    });

    describe('Token Validation', () => {
        beforeEach(async () => {
            // Create a test user
            const hashedPassword = await bcrypt.hash(testUser.password, 10);
            const user = await User.create({
                ...testUser,
                password: hashedPassword
            });
            authToken = jwt.sign(
                { id: user._id, email: user.email },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
        });

        test('should validate token expiration', async () => {
            // Create an expired token
            const expiredToken = jwt.sign(
                { id: 'test-id', email: testUser.email },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '0s' }
            );

            const response = await request(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        test('should validate token signature', async () => {
            // Create token with wrong secret
            const invalidToken = jwt.sign(
                { id: 'test-id', email: testUser.email },
                'wrongsecret'
            );

            const response = await request(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${invalidToken}`);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });
}); 