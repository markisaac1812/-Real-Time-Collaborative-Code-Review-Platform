import { performanceMonitor } from '../utils/performanceMonitoring.js';
import { redis } from '../config/redis.js';

// Response compression middleware
export const compressionMiddleware = (req, res, next) => {
  // Enable gzip compression for JSON responses
  if (req.headers['accept-encoding'] && req.headers['accept-encoding'].includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
  }
  next();
};

// Response time header middleware
export const responseTimeMiddleware = (req, res, next) => {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const milliseconds = seconds * 1000 + nanoseconds / 1000000;
    res.setHeader('X-Response-Time', `${milliseconds.toFixed(2)}ms`);
  });

  next();
};

// Memory usage monitoring
export const memoryMonitorMiddleware = (req, res, next) => {
  const memoryUsage = process.memoryUsage();
  
  // Log memory warnings
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  if (heapUsedMB > 500) { // Warn if heap usage > 500MB
    console.warn(`⚠️ High memory usage: ${heapUsedMB.toFixed(2)}MB`);
  }

  // Add memory info to response headers in development
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('X-Memory-Usage', `${heapUsedMB.toFixed(2)}MB`);
  }

  next();
};

// Database connection monitoring
export const dbConnectionMonitor = async () => {
  const connections = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  console.log(`📊 Database connection state: ${states[connections]}`);
  
  if (connections === 1) {
    const dbMetrics = await performanceMonitor.getDatabaseMetrics();
    if (dbMetrics) {
      console.log('📈 Database metrics:', {
        dataSize: `${dbMetrics.database.dataSize}MB`,
        indexSize: `${dbMetrics.database.indexSize}MB`,
        connections: dbMetrics.performance.connections.current
      });
    }
  }
};

// Redis connection monitoring
export const redisConnectionMonitor = async () => {
  try {
    const info = await redis.info('server');
    const lines = info.split('\r\n');
    const uptimeSeconds = lines.find(line => line.startsWith('uptime_in_seconds:'))?.split(':')[1];
    const connectedClients = lines.find(line => line.startsWith('connected_clients:'))?.split(':')[1];
    
    console.log(`📡 Redis uptime: ${uptimeSeconds}s, clients: ${connectedClients}`);
  } catch (error) {
    console.error('❌ Redis monitoring failed:', error.message);
  }
};

// Start performance monitoring
export const startPerformanceMonitoring = () => {
  // Monitor database and Redis every 5 minutes
  setInterval(async () => {
    await dbConnectionMonitor();
    await redisConnectionMonitor();
  }, 5 * 60 * 1000);

  // Log performance metrics every minute
  setInterval(() => {
    const metrics = performanceMonitor.getMetrics();
    console.log('⚡ Performance metrics:', {
      totalQueries: metrics.totalQueries,
      slowQueries: metrics.slowQueries,
      slowQueryPercentage: `${metrics.slowQueryPercentage}%`,
      avgResponseTime: `${metrics.averageQueryTime.toFixed(2)}ms`
    });
  }, 60 * 1000);

  console.log('📊 Performance monitoring started');
};