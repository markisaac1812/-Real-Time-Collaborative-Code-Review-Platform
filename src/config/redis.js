import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
};

// Create Redis instances
export const redis = new Redis(redisConfig);
export const redisSubscriber = new Redis(redisConfig);
export const redisPublisher = new Redis(redisConfig);

// Redis connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('ready', () => {
  console.log('🚀 Redis is ready to accept commands');
});

// Test Redis connection
export const testRedisConnection = async () => {
  try {
    await redis.ping();
    console.log('📡 Redis ping successful');
    return true;
  } catch (error) {
    console.error('❌ Redis ping failed:', error);
    return false;
  }
};

// Graceful Redis shutdown
export const closeRedisConnections = async () => {
  try {
    await Promise.all([
      redis.quit(),
      redisSubscriber.quit(),
      redisPublisher.quit()
    ]);
    console.log('👋 Redis connections closed gracefully');
  } catch (error) {
    console.error('Error closing Redis connections:', error);
  }
};
