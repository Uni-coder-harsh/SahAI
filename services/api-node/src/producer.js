const Redis = require('ioredis');
const config = require('./config');

// Initialize Redis Client
const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null, // Critical for Celery-like custom consumers
  reconnectOnError: (err) => {
    console.error('Redis connection error:', err);
    return true; // reconnect
  }
});

redis.on('connect', () => {
  console.log('Connected to Redis server.');
});

redis.on('error', (err) => {
  console.error('Redis error occurred:', err);
});

/**
 * Pushes telemetry payload onto the Redis queue.
 * @param {Object} payload Telemetry payload
 */
async function publishTelemetry(payload) {
  try {
    const message = JSON.stringify(payload);
    await redis.rpush(config.TELEMETRY_QUEUE, message);
    return true;
  } catch (error) {
    console.error('Failed to push payload to Redis queue:', error);
    throw error;
  }
}

module.exports = {
  redis,
  publishTelemetry
};
