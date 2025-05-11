const supertest = require('supertest');
// const app = require('../index');
const {MongoMemoryServer} = require('mongodb-memory-server');
const {app, startServer, stopServer} = require('../server');
const jwt = require('jsonwebtoken');
// const ProfileRepository = require('../data/profiles');
const Profile = require('../models/Profile');
const User = require('../models/User');

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

describe('System Controller', () => {
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
    
    test('should return system status', async () => {
        const response = await request.get('/system/status');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'online');
        expect(response.body).toHaveProperty('version');
        // expect(response.body).toBeEqual({"status": "online", "version": "1.0.0"});
    });

    test('should return swipes based on filters', async () => {
        const response = await request.get('/system/swipes?location=-13,-38&ageRange=20-30&gender=male')
        .set('Authorization', `Bearer ${authToken}`);
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});

