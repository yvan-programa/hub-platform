// src/middleware/cache.js
const redis = require('../config/redis');
const logger = require('../utils/logger');

const cache = (duration = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cachedData = await redis.cache.get(key);
      
      if (cachedData) {
        logger.debug(`Cache hit: ${key}`);
        return res.json(cachedData);
      }

      logger.debug(`Cache miss: ${key}`);
      
      // Store original json function
      const originalJson = res.json.bind(res);
      
      // Override json function
      res.json = (data) => {
        redis.cache.set(key, data, duration).catch((err) => {
          logger.error('Cache set error:', err);
        });
        originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

module.exports = cache;
