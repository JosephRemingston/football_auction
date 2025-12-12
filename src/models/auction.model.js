// src/models/auction.model.js
const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  isAuto: { type: Boolean, default: false }
});

const AuctionSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  startTime: { type: Date },
  endTime: { type: Date },
  reservePrice: { type: Number, default: 0 },
  highestBid: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    timestamp: Date
  },
  bids: [BidSchema],
  status: { type: String, enum: ['scheduled','running','ended','settled'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Auction', AuctionSchema);
