const express = require('express');
const router = express.Router();
const messages = require('../data/messages');
const profiles = require('../data/profiles');

// Get all messages between two users
router.get('/:userId/:matchId', (req, res) => {
    const { userId, matchId } = req.params;
    
    // Check if both users exist
    const user = profiles.find(p => p.id === userId);
    const match = profiles.find(p => p.id === matchId);
    
    if (!user || !match) {
        return res.status(404).json({ error: 'User or match not found' });
    }
    
    // Check if they are matched
    if (!user.matches.includes(matchId) || !match.matches.includes(userId)) {
        return res.status(403).json({ error: 'Users are not matched' });
    }
    
    const conversation = messages.filter(m => 
        (m.senderId === userId && m.receiverId === matchId) ||
        (m.senderId === matchId && m.receiverId === userId)
    );
    
    res.json(conversation);
});

// Send a message
router.post('/:userId/:matchId', (req, res) => {
    const { userId, matchId } = req.params;
    const { content } = req.body;
    
    if (!content) {
        return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Check if both users exist
    const user = profiles.find(p => p.id === userId);
    const match = profiles.find(p => p.id === matchId);
    
    if (!user || !match) {
        return res.status(404).json({ error: 'User or match not found' });
    }
    
    // Check if they are matched
    if (!user.matches.includes(matchId) || !match.matches.includes(userId)) {
        return res.status(403).json({ error: 'Users are not matched' });
    }
    
    const newMessage = {
        id: Date.now().toString(),
        senderId: userId,
        receiverId: matchId,
        content,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    messages.push(newMessage);
    res.status(201).json(newMessage);
});

// Mark messages as read
router.put('/:userId/:matchId/read', (req, res) => {
    const { userId, matchId } = req.params;
    
    // Check if both users exist
    const user = profiles.find(p => p.id === userId);
    const match = profiles.find(p => p.id === matchId);
    
    if (!user || !match) {
        return res.status(404).json({ error: 'User or match not found' });
    }
    
    // Mark all unread messages from match to user as read
    messages.forEach(m => {
        if (m.senderId === matchId && m.receiverId === userId && !m.read) {
            m.read = true;
        }
    });
    
    res.status(200).json({ message: 'Messages marked as read' });
});

// Delete a message (only sender can delete)
router.delete('/:messageId', (req, res) => {
    const { messageId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const messageIndex = messages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) {
        return res.status(404).json({ error: 'Message not found' });
    }
    
    if (messages[messageIndex].senderId !== userId) {
        return res.status(403).json({ error: 'Only the sender can delete the message' });
    }
    
    messages.splice(messageIndex, 1);
    res.status(200).json({ message: 'Message deleted' });
});

module.exports = router;
