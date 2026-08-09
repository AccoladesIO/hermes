'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: { title: 'Hermes User Service', version: '1.0.0' },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user and receive a JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created' }, 409: { description: 'Email taken' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in and receive a JWT',
        responses: { 200: { description: 'OK' }, 401: { description: 'Invalid credentials' } },
      },
    },
    '/users': {
      get: {
        summary: 'List users (paginated)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/users/me': {
      get: {
        summary: 'Get the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
    },
  },
};

const router = express.Router();
router.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
router.get('/openapi.json', (req, res) => res.json(spec));

module.exports = router;
