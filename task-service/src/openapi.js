'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: { title: 'Hermes Task Service', version: '1.0.0' },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/tasks': {
      get: {
        summary: "List the caller's tasks (paginated)",
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          },
        ],
        responses: { 200: { description: 'OK' }, 401: { description: 'Unauthorized' } },
      },
      post: {
        summary: 'Create a task and emit a task.created event',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created' }, 401: { description: 'Unauthorized' } },
      },
    },
  },
};

const router = express.Router();
router.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
router.get('/openapi.json', (req, res) => res.json(spec));

module.exports = router;
