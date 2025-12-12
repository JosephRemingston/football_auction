// src/routes/room.routes.js
const express = require('express');
const router = express.Router();
const Room = require('../models/room.model');
const { expressAuthMiddleware } = require('../middleware/auth.middleware');

// Create Room
router.post('/create', expressAuthMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Room name required" });

    const room = await Room.create({
      name,
      hostUserId: req.userId,
      players: [],
      status: "open"
    });

    res.json({ room });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Join room
router.post('/join', expressAuthMiddleware, async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: "roomId required" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const exists = room.players.some(p => p.userId.toString() === req.userId);
    if (!exists) {
      room.players.push({ userId: req.userId });
      await room.save();
    }

    res.json({ room, message: "Joined room successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get room by ID
router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json({ room });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
