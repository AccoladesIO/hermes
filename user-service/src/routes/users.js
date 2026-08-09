'use strict';

const express = require('express');
const { z } = require('zod');
const User = require('../models/user');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// All routes below require a valid JWT.
router.use(requireAuth);

// GET /users/me — the caller's own profile
router.get('/me', async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'NotFound', message: 'User not found' });
  return res.json(user);
});

// GET /users — paginated list
router.get('/', validate(listQuerySchema, 'query'), async (req, res) => {
  const { page, limit } = req.query;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);

  return res.json({
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).catch(() => null);
  if (!user) return res.status(404).json({ error: 'NotFound', message: 'User not found' });
  return res.json(user);
});

module.exports = router;
