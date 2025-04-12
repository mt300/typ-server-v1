const request = require('supertest');
const { app, startServer, stopServer } = require('../server'); // Import app as well
const mongoose = require('mongoose');

let server;

jest.setTimeout(30000);

beforeAll(async () => {
    server = await startServer();
});

afterAll(async () => {
    await stopServer(server);
    await mongoose.disconnect();
});

describe('Server', () => {
    test('should respond to GET /auth/register', async () => {
        const response = await request(app)
            .get('/auth/register');
        expect(response.status).toBe(400); // Should return 400 for missing data
    });

    test('should have CORS headers', async () => {
        const response = await request(app)
            .options('/auth/register')
            .set('Origin', 'http://localhost:3000')
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'Content-Type, Authorization');
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
        expect(response.headers['access-control-allow-headers']).toBe('Content-Type, Authorization');
    });

    test('should return system status', async () => {
        const response = await request(app)
            .get('/system/status');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'online');
        expect(response.body).toHaveProperty('version');
    });
}); 