'use strict';

const express = require('express');
const { z } = require('zod');
const Task = require('../models/task');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const publisher = require('../messaging/publisher');

const router = express.Router();

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
});

router.use(requireAuth);

// POST /tasks — create a task (owner = authenticated user) and emit an event.
router.post('/', validate(createSchema), async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.sub;

  const task = await Task.create({ title, description, userId });

  // Publish only after the DB write succeeds; wait for broker confirmation.
  await publisher.publishTaskCreated(
    { taskId: task.id, title, description, userId },
    { requestId: req.id }
  );

  return res.status(201).json(task);
});

// GET /tasks — the caller's tasks, paginated & optionally filtered by status.
router.get('/', validate(listQuerySchema, 'query'), async (req, res) => {
  const { page, limit, status } = req.query;
  const filter = { userId: req.user.sub };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Task.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Task.countDocuments(filter),
  ]);

  return res.json({
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

module.exports = router;
