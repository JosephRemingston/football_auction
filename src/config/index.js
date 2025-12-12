// src/config/index.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI || 'mongodb://mongo:27017/football-auction',
  jwtSecret: process.env.JWT_SECRET || 'change_this_secret',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  antiSnipeWindowSec: Number(process.env.ANTI_SNIPE_WINDOW || 10),
  antiSnipeExtendSec: Number(process.env.ANTI_SNIPE_EXTEND || 10),
  minIncrementPct: Number(process.env.MIN_INCREMENT_PCT || 0.05),
};
