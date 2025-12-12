// src/routes/auction.routes.js
const express = require('express');
const router = express.Router();
const Auction = require('../models/auction.model');
const Room = require('../models/room.model');
const Player = require('../models/player.model');
const { expressAuthMiddleware } = require('../middleware/auth.middleware');
const auctionService = require('../services/auction.service');

// Create Auction
router.post('/create', expressAuthMiddleware, async (req, res) => {
  try {
    const { roomId, playerId, durationSec = 30, reservePrice = 0 } = req.body;

    if (!roomId || !playerId)
      return res.status(400).json({ error: "roomId & playerId required" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: "Player not found" });

    const auction = await auctionService.createAuction({
      roomId,
      playerId,
      durationSec,
      reservePrice
    });

    res.json({ auction, message: "Auction created successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start Auction (optional endpoint, create already starts it)
router.post('/start', expressAuthMiddleware, async (req, res) => {
  try {
    const { auctionId } = req.body;
    if (!auctionId) return res.status(400).json({ error: "auctionId required" });

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ error: "Auction not found" });

    auction.status = 'running';
    await auction.save();

    res.json({ message: "Auction started", auction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get auction details
router.get('/:auctionId', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.auctionId);
    if (!auction) return res.status(404).json({ error: "Auction not found" });

    res.json({ auction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
