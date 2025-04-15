const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Message = require('../models/Message');

// Get messages between users
router.get('/:userId', authenticateToken, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, recipient: req.params.userId },
                { sender: req.params.userId, recipient: req.user.id }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send a message
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { recipientId, content } = req.body;

        if (!recipientId || !content) {
            return res.status(400).json({ error: 'Recipient ID and content are required' });
        }

        const message = new Message({
            sender: req.user.id,
            recipient: recipientId,
            content
        });

        await message.save();
        res.status(201).json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark message as read
router.put('/:messageId/read', authenticateToken, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        console.log('Recipient', message.recipient.toString())
        if (message.recipient.toString() !== req.user.id) {
            return res.status(405).json({ error: 'Not authorized to mark this message as read' });
        }

        message.read = true;
        await message.save();

        res.json(message);
    } catch (error) {
        console.error('Mark message as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete message
router.delete('/:messageId', authenticateToken, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this message' });
        }

        await Message.deleteOne({ id: req.user.id });
        res.status(200).json({ message: 'Message deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 