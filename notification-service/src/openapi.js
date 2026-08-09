'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: { title: 'Hermes Notification Service', version: '1.0.0' },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/notifications': {
      get: {
        summary: "List the caller's notifications (paginated)",
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'unread', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { 200: { description: 'OK' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        summary: 'Mark a notification as read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } },
      },
    },
  },
};

const router = express.Router();
router.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
router.get('/openapi.json', (req, res) => res.json(spec));

module.exports = router;
