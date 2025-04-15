const express = require('express')
const router = express.Router()
const Profile = require('../models/Profile')
const Match = require('../models/Match')

// Get all matches for current user
router.get('/', async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.user.id;

        // Encontre todos os matches do usuário autenticado
        const matches = await Match.find({
            $or: [{ user1: userId }, { user2: userId }],
            status: 'matched'
        });

        // Pegue os IDs dos "outros usuários" nos matches
        const matchedUserIds = matches.map(match => {
            return match.user1.toString() === userId ? match.user2 : match.user1;
        });

        // Busque os perfis dos usuários que deram match com o usuário autenticado
        const matchedProfiles = await Profile.find({
            userId: { $in: matchedUserIds }
        });

        return res.status(200).json(matchedProfiles);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});


// Get match history
router.get('/history', async (req, res) => {
    try {
        const userId = req.user.id
        const matches = await Match.find({
            $or: [{ user1: userId }, { user2: userId }]
        }).populate('user1 user2', 'name photos preferences')
            .sort({ createdAt: -1 })

        res.json(matches)
    } catch (error) {
        // console.error('Error fetching match history:', error)
        res.status(500).json({ error: 'Failed to fetch match history' })
    }
})

// Get specific match details
router.get('/:matchId', async (req, res) => {
    try {
        const match = await Match.findById(req.params.matchId)
            .populate('user1 user2', 'name photos preferences')

        if (!match) {
            return res.status(404).json({ error: 'Match not found' })
        }

        // Check if user is part of the match
        if (match.user1.toString() !== req.user.id && match.user2.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to view this match' })
        }

        res.json(match)
    } catch (error) {
        // console.error('Error fetching match details:', error)
        res.status(500).json({ error: 'Failed to fetch match details' })
    }
})

// Unmatch with a user
router.delete('/:matchId', async (req, res) => {
    try {
        const match = await Match.findById(req.params.matchId)

        if (!match) {
            return res.status(404).json({ error: 'Match not found' })
        }

        // Check if user is part of the match
        if (match.user1.toString() !== req.user.id && match.user2.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to unmatch' })
        }

        match.status = 'unmatched'
        await match.save()

        res.json({ message: 'Successfully unmatched' })
    } catch (error) {
        // console.error('Error unmatching:', error)
        res.status(500).json({ error: 'Failed to unmatch' })
    }
})

module.exports = router 