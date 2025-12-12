// src/models/player.model.js
const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: String,
  club: String,
  skillRating: { type: Number, default: 50 },
  imageUrl: String,
  baseValue: { type: Number, default: 10 },
  rarity: { type: String, enum: ['common','rare','epic','legend'], default: 'common' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', PlayerSchema);
