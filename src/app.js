// src/app.js
const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');

const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const auctionRoutes = require('./routes/auction.routes');

const app = express();

app.use(express.json());

// health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/auctions', auctionRoutes);

// dev player create
app.post('/api/debug/create-player', async (req, res) => {
  try {
    const Player = require('./models/player.model');
    const player = await Player.create(req.body);
    res.json(player);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = app;
