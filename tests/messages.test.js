const supertest = require('supertest');
const {app, startServer, stopServer} = require('../index');
const request = supertest(app);
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

describe('Messages Controller', () => {
    let mongoServer;
    let authToken;
    let testUser;
    let testUser2;
    let server
    beforeAll(async () => {
        try {
            mongoServer = await MongoMemoryServer.create();
            // console.log('mongoServer:', mongoServer)
            const mongoUri = mongoServer.getUri();
            server = await startServer(mongoUri)
            
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 30000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 30000,
                maxPoolSize: 10,
                minPoolSize: 1
            });

            // Create test users
            testUser = await User.create({
                email: 'test1@example.com',
                password: 'password123',
                name: 'Test User 1'
            });

            testUser2 = await User.create({
                email: 'test2@example.com',
                password: 'password123',
                name: 'Test User 2'
            });

            // Generate auth token
            authToken = jwt.sign(
                { id: testUser._id, email: testUser.email },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
            authToken2 = jwt.sign(
                { id: testUser2._id, email: testUser2.email },
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
            await stopServer(server);
            await mongoServer.stop();
        } catch (error) {
            console.error('Cleanup error:', error);
            throw error;
        }
    });

    beforeEach(async () => {
        await Message.deleteMany({});
    });

    describe('GET /:userId', () => {
        test('should return messages between users', async () => {
            // Create a test message first
            await Message.create({
                sender: testUser._id,
                recipient: testUser2._id,
                content: 'Test message'
            });

            const response = await request
                .get(`/messages/${testUser2._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0].content).toBe('Test message');
        });
    });

    describe('POST /', () => {
        test('should send a message', async () => {
            const response = await request
                .post('/messages')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    recipientId: testUser2._id,
                    content: 'Test message'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('content', 'Test message');
        });

        test('should return 400 if content is missing', async () => {
            const response = await request
                .post('/messages')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    recipientId: testUser2._id
                });

            expect(response.status).toBe(400);
        });
    });

    describe('PUT /:messageId/read', () => {
        test('should mark message as read', async () => {
            const message = await Message.create({
                sender: testUser._id,
                recipient: testUser2._id,
                content: 'Test message'
            });

            const response = await request
                .put(`/messages/${message._id}/read`)
                .set('Authorization', `Bearer ${authToken2}`);

            // console.log("response",response)
            expect(response.status).toBe(200);
            expect(response.body.read).toBe(true);
        });
    });

    describe('DELETE /:messageId', () => {
        test('should delete message', async () => {
            const message = await Message.create({
                sender: testUser._id,
                recipient: testUser2._id,
                content: 'Test message'
            });

            const response = await request
                .delete(`/messages/${message._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });
    });
}); 