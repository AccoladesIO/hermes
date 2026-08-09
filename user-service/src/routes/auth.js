'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/user');
const validate = require('../middleware/validate');
const config = require('../config');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

// POST /auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: 'Conflict', message: 'Email already registered' });
  }

  const user = new User({ name, email });
  await user.setPassword(password);
  await user.save();

  return res.status(201).json({ user, token: signToken(user) });
});

// POST /auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.verifyPassword(password))) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
  }

  return res.json({ user, token: signToken(user) });
});

module.exports = router;
