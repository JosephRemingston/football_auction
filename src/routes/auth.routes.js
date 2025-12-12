// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');

// register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const user = await userService.register({ username, email, password });
    res.json({ user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) return res.status(400).json({ error: 'username/email and password required' });
    const { user, token } = await userService.login({ usernameOrEmail, password });
    res.json({ user: { id: user._id, username: user.username }, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
