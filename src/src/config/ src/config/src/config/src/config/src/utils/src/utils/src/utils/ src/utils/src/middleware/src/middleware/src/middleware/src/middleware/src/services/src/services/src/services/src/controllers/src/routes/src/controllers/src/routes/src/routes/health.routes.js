// src/routes/health.routes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const redis = require('../config/redis');

router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'burundi-digital-hub-backend',
    version: '1.0.0',
    checks: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    await db.query('SELECT 1');
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    await redis.ping();
    health.checks.redis = 'healthy';
  } catch (error) {
    health.checks.redis = 'unhealthy';
    health.status = 'degraded';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

module.exports = router;
