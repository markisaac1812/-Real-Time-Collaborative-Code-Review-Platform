import Bull from 'bull';
import { redis } from './redis.js';

// Queue configurations
const queueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  },
  defaultJobOptions: {
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 100,    // Keep last 100 failed jobs
    attempts: 3,          // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
};

// Create queues
export const emailQueue = new Bull('email processing', queueConfig);
export const analyticsQueue = new Bull('analytics processing', queueConfig);
export const codeAnalysisQueue = new Bull('code analysis', queueConfig);
export const reputationQueue = new Bull('reputation calculation', queueConfig);
export const notificationQueue = new Bull('notification processing', queueConfig);
export const cleanupQueue = new Bull('cleanup tasks', queueConfig);

// Queue monitoring and logging
const queues = [emailQueue, analyticsQueue, codeAnalysisQueue, reputationQueue, notificationQueue, cleanupQueue];

queues.forEach(queue => {
  queue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} in ${queue.name} completed`);
  });

  queue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} in ${queue.name} failed:`, err.message);
  });

  queue.on('stalled', (job) => {
    console.warn(`⚠️ Job ${job.id} in ${queue.name} stalled`);
  });
});

// Graceful shutdown
export const closeQueues = async () => {
  console.log('🔄 Closing job queues...');
  await Promise.all(queues.map(queue => queue.close()));
  console.log('✅ All queues closed');
};