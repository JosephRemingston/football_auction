// src/models/user.model.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, trim: true },
  passwordHash: { type: String, required: true },
  balance: { type: Number, default: 1000 }, // in-game currency default
  avatarUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
