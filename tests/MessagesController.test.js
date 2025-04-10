const supertest = require('supertest');
const app = require('../index');
const request = supertest(app);

const ProfileRepository = require('../data/profiles');
const MessageRepository = require('../data/messages');

describe('Messages Controller', () => {
    let user1, user2, user3;
    
    beforeEach(() => {
        // Reset repositories
        MessageRepository.length = 0;
        ProfileRepository.length = 0;
        
        // Create test users
        user1 = {
            id: '1',
            name: 'User 1',
            matches: ['2']
        };
        
        user2 = {
            id: '2',
            name: 'User 2',
            matches: ['1']
        };
        
        user3 = {
            id: '3',
            name: 'User 3',
            matches: []
        };
        
        ProfileRepository.push(user1, user2, user3);
    });
    
    describe('GET /:userId/:matchId', () => {
        test('should return conversation between matched users', async () => {
            // Add some test messages
            MessageRepository.push(
                {
                    id: '1',
                    senderId: '1',
                    receiverId: '2',
                    content: 'Hello!',
                    timestamp: '2024-01-01T00:00:00Z',
                    read: false
                },
                {
                    id: '2',
                    senderId: '2',
                    receiverId: '1',
                    content: 'Hi there!',
                    timestamp: '2024-01-01T00:01:00Z',
                    read: false
                }
            );
            
            const response = await request.get('/messages/1/2');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].content).toBe('Hello!');
            expect(response.body[1].content).toBe('Hi there!');
        });
        
        test('should return 404 if user not found', async () => {
            const response = await request.get('/messages/999/2');
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('User or match not found');
        });
        
        test('should return 403 if users are not matched', async () => {
            const response = await request.get('/messages/1/3');
            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Users are not matched');
        });
    });
    
    describe('POST /:userId/:matchId', () => {
        test('should send a message between matched users', async () => {
            const response = await request
                .post('/messages/1/2')
                .send({ content: 'New message' });
            
            expect(response.status).toBe(201);
            expect(response.body.content).toBe('New message');
            expect(response.body.senderId).toBe('1');
            expect(response.body.receiverId).toBe('2');
            expect(response.body.read).toBe(false);
            expect(MessageRepository).toHaveLength(1);
        });
        
        test('should return 400 if content is missing', async () => {
            const response = await request
                .post('/messages/1/2')
                .send({});
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Message content is required');
        });
        
        test('should return 404 if user not found', async () => {
            const response = await request
                .post('/messages/999/2')
                .send({ content: 'Hello' });
            
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('User or match not found');
        });
        
        test('should return 403 if users are not matched', async () => {
            const response = await request
                .post('/messages/1/3')
                .send({ content: 'Hello' });
            
            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Users are not matched');
        });
    });
    
    describe('PUT /:userId/:matchId/read', () => {
        test('should mark messages as read', async () => {
            // Add unread messages
            MessageRepository.push(
                {
                    id: '1',
                    senderId: '2',
                    receiverId: '1',
                    content: 'Message 1',
                    timestamp: '2024-01-01T00:00:00Z',
                    read: false
                },
                {
                    id: '2',
                    senderId: '2',
                    receiverId: '1',
                    content: 'Message 2',
                    timestamp: '2024-01-01T00:01:00Z',
                    read: false
                }
            );
            
            const response = await request.put('/messages/1/2/read');
            
            expect(response.status).toBe(200);
            expect(MessageRepository.every(m => m.read)).toBe(true);
        });
        
        test('should return 404 if user not found', async () => {
            const response = await request.put('/messages/999/2/read');
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('User or match not found');
        });
    });
    
    describe('DELETE /:messageId', () => {
        beforeEach(() => {
            MessageRepository.push({
                id: '1',
                senderId: '1',
                receiverId: '2',
                content: 'Message to delete',
                timestamp: '2024-01-01T00:00:00Z',
                read: false
            });
        });
        
        test('should delete message if sender requests it', async () => {
            const response = await request.delete('/messages/1?userId=1');
            
            expect(response.status).toBe(200);
            expect(MessageRepository).toHaveLength(0);
        });
        
        test('should return 400 if userId is missing', async () => {
            const response = await request.delete('/messages/1');
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('User ID is required');
        });
        
        test('should return 404 if message not found', async () => {
            const response = await request.delete('/messages/999?userId=1');
            
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Message not found');
        });
        
        test('should return 403 if non-sender tries to delete', async () => {
            const response = await request.delete('/messages/1?userId=2');
            
            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Only the sender can delete the message');
        });
    });
}); 