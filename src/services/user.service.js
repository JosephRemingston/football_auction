// src/services/user.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { jwtSecret } = require('../config');

async function register({ username, email, password }) {
  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) throw new Error('Username or email already taken');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, passwordHash });
  return user;
}

async function login({ usernameOrEmail, password }) {
  const user = await User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] });
  if (!user) throw new Error('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');
  const token = jwt.sign({ sub: user._id.toString(), username: user.username }, jwtSecret, { expiresIn: '7d' });
  return { user, token };
}

module.exports = { register, login };
