const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

describe('Authentication System', () => {
    let testUser = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
    };
    let authToken;

    beforeEach(async () => {
        // Clear any existing test data
        // Add test user to database
    });

    afterEach(async () => {
        // Clean up test data
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
        test('should access protected route with valid token', async () => {
            const response = await request(app)
                .get('/profiles/me')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('email', testUser.email);
        });

        test('should not access protected route without token', async () => {
            const response = await request(app)
                .get('/profiles/me');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        test('should not access protected route with invalid token', async () => {
            const response = await request(app)
                .get('/profiles/me')
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
        test('should validate token expiration', async () => {
            // Create an expired token
            const expiredToken = jwt.sign(
                { email: testUser.email },
                process.env.JWT_SECRET,
                { expiresIn: '0s' }
            );

            const response = await request(app)
                .get('/profiles/me')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        test('should validate token signature', async () => {
            // Create token with wrong secret
            const invalidToken = jwt.sign(
                { email: testUser.email },
                'wrongsecret'
            );

            const response = await request(app)
                .get('/profiles/me')
                .set('Authorization', `Bearer ${invalidToken}`);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });
}); 