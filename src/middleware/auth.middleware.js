// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { jwtSecret } = require('../config');

async function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: missing token'));
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user) return next(new Error('Authentication error: user not found'));
    socket.user = user;
    return next();
  } catch (err) {
    console.error('socket auth error', err.message);
    return next(new Error('Authentication error'));
  }
}

function expressAuthMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'missing authorization header' });
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'invalid authorization format' });
    const token = parts[1];
    const payload = jwt.verify(token, jwtSecret);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

module.exports = { socketAuthMiddleware, expressAuthMiddleware };
