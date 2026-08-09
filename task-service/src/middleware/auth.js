'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

// Verifies a Bearer JWT and attaches { sub, email } to req.user.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing Bearer token' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { sub: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;
