'use strict';

const express = require('express');
const { z } = require('zod');
const Notification = require('../models/notification');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

router.use(requireAuth);

// GET /notifications — the caller's notifications, newest first.
router.get('/', validate(listQuerySchema, 'query'), async (req, res) => {
  const { page, limit, unread } = req.query;
  const filter = { userId: req.user.sub };
  if (unread !== undefined) filter.read = !unread;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return res.json({
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// PATCH /notifications/:id/read — mark one as read.
router.patch('/:id/read', async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.sub },
    { read: true },
    { new: true }
  ).catch(() => null);

  if (!notification) {
    return res.status(404).json({ error: 'NotFound', message: 'Notification not found' });
  }
  return res.json(notification);
});

module.exports = router;
