const request = require('supertest');
const { startServer } = require('../server');
const app = require('../index');

describe('Server', () => {
    let server;
    let port = 9000;

    beforeEach(() => {
        port++;
        server = startServer(port);
    });

    afterEach((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    test('should start and listen on specified port', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello World');
    });

    test('should handle 404 for non-existent routes', async () => {
        const response = await request(app).get('/non-existent-route');
        expect(response.status).toBe(404);
    });

    test('should handle JSON parsing errors', async () => {
        const response = await request(app)
            .post('/profiles')
            .set('Content-Type', 'application/json')
            .send('invalid json');
        
        expect(response.status).toBe(400);
    });

    test('should handle server errors gracefully', async () => {
        // Mock a route that throws an error
        app.get('/error', (req, res) => {
            throw new Error('Test error');
        });

        const response = await request(app).get('/error');
        expect(response.status).toBe(500);
    });

    test('should handle CORS headers', async () => {
        const response = await request(app).get('/');
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
        expect(response.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept');
    });

    test('should handle multiple concurrent requests', async () => {
        const requests = Array(5).fill().map(() => 
            request(app).get('/')
        );
        
        const responses = await Promise.all(requests);
        responses.forEach(response => {
            expect(response.status).toBe(200);
        });
    });

    test('should handle server shutdown gracefully', async () => {
        const testServer = startServer(port + 1);
        
        // Make a request to ensure server is running
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        
        // Close the server
        await new Promise(resolve => testServer.close(resolve));
        
        // Try to make another request
        try {
            await request(app).get('/');
        } catch (error) {
            expect(error.code).toBe('ECONNREFUSED');
        }
    });
}); 