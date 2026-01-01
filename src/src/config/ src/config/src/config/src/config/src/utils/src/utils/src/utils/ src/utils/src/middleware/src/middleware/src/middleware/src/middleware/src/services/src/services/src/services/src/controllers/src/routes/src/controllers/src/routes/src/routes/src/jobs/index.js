// src/jobs/index.js
const cron = require('node-cron');
const logger = require('../utils/logger');
const db = require('../config/database');
const redis = require('../config/redis');

const startBackgroundJobs = () => {
  // Clean up old traffic data every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await db.query(
        "DELETE FROM traffic_data WHERE created_at < NOW() - INTERVAL '24 hours'"
      );
      logger.info(`Cleaned up ${result.rowCount} old traffic records`);
    } catch (error) {
      logger.error('Traffic cleanup job error:', error);
    }
  });

  // Clean up expired cache entries every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      // Redis automatically handles TTL, but we can do manual cleanup if needed
      logger.info('Cache cleanup job completed');
    } catch (error) {
      logger.error('Cache cleanup job error:', error);
    }
  });

  // Update trending content every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      await redis.cache.del('news:trending:10');
      logger.info('Trending content cache cleared');
    } catch (error) {
      logger.error('Trending update job error:', error);
    }
  });

  logger.info('Background jobs started');
};

module.exports = { startBackgroundJobs };
