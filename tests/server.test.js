const request = require('supertest');
const { app, connectWithRetry, disconnect } = require('../index');
const mongoose = require('mongoose');

let server;

jest.setTimeout(30000);

beforeAll(async () => {
    await connectWithRetry(true);
    server = app.listen(3000);
});

afterAll(async () => {
    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
    await disconnect();
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
}); 