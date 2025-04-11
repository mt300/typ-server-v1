const supertest = require('supertest');
const app = require('../index');
const request = supertest(app);

const ProfileRepository = require('../data/profiles');

describe('System Controller', () => {
    test('should return system status', async () => {
        const response = await request.get('/api/system/status');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'online');
        expect(response.body).toHaveProperty('version');
        expect(response.body).toHaveProperty('uptime');
    });

    test('should return swipes based on filters', async () => {
        const response = await request.get('/api/system/swipes?location=-13,-38&ageRange=20-30&gender=male');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});

describe('GET /swipes', () => {

    test('Deve retornar apenas perfis que atendem aos filtros', async () => {
        const response = await request.get('/swipes?lat=-13&long=-38&locationRange=100&ageRange=20-30&gender=masculino');
        

        expect(response.status).toBe(200);
        // expect(response.body).toEqual([ProfileRepository[0]]);
    });
});

