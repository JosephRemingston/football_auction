// src/models/room.model.js
const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    displayName: String
  }],
  settings: {
    bidIncrementType: { type: String, enum: ['fixed','percent'], default: 'percent' },
    bidIncrementValue: { type: Number, default: 5 }, // percent or fixed amount
    auctionTimeSec: { type: Number, default: 30 },
    antiSnipeWindowSec: { type: Number, default: 10 },
    antiSnipeExtendSec: { type: Number, default: 10 },
    maxPlayersPerRoom: { type: Number, default: 50 }
  },
  status: { type: String, enum: ['open','inProgress','closed'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);
