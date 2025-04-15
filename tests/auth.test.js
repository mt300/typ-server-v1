const request = require('supertest');
const { app, startServer, stopServer } = require('../index');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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
    await User.deleteMany({});
});

describe('Authentication System', () => {
    describe('User Registration', () => {
        test('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!',
                    name: 'Test User'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe('test@example.com');
        });

        test('should not register user with invalid email', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'Password123!',
                    name: 'Test User'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        test('should not register user with weak password', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'weak',
                    name: 'Test User'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('User Login', () => {
        beforeEach(async () => {
            // Create a test user
            const hashedPassword = await bcrypt.hash('Password123!', 10);
            await User.create({
                email: 'test@example.com',
                password: hashedPassword,
                name: 'Test User'
            });
        });

        test('should login user successfully', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
        });

        test('should not login with wrong password', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'test@example.com',
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
                    password: 'Password123!'
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Protected Routes', () => {
        let authToken;

        beforeEach(async () => {
            // Create a test user and generate token
            const user = await User.create({
                email: 'test@example.com',
                password: await bcrypt.hash('Password123!', 10),
                name: 'Test User'
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
        });

        test('should not access protected route without token', async () => {
            const response = await request(app)
                .get('/auth/me');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'No token provided');
        });

        test('should not access protected route with invalid token', async () => {
            const response = await request(app)
                .get('/auth/me')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Invalid token');
        });
    });

    describe('Password Hashing', () => {
        test('should hash password on registration', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!',
                    name: 'Test User'
                });

            const user = await User.findOne({ email: 'test@example.com' });
            expect(user.password).not.toBe('Password123!');
            expect(await bcrypt.compare('Password123!', user.password)).toBe(true);
        });
    });

    describe('Token Validation', () => {
        test('should validate token expiration', async () => {
            const expiredToken = jwt.sign(
                { id: new mongoose.Types.ObjectId(), email: 'test@example.com' },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '0s' }
            );

            const response = await request(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Token expired');
        });

        test('should validate token signature', async () => {
            const invalidToken = jwt.sign(
                { id: new mongoose.Types.ObjectId(), email: 'test@example.com' },
                'wrong-secret-key'
            );

            const response = await request(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${invalidToken}`);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Invalid token');
        });
    });
}); 