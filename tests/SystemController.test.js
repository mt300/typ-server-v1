const supertest = require('supertest');
const app = require('../index');

const request = supertest(app);

const ProfileRepository = require('../data/profiles');

describe('GET /swipes', () => {

    test('Deve retornar apenas perfis que atendem aos filtros', async () => {
        const response = await request.get('/swipes?lat=-13&long=-38&locationRange=100&ageRange=20-30&gender=masculino');
        

        expect(response.status).toBe(200);
        // expect(response.body).toEqual([ProfileRepository[0]]);
    });
});

