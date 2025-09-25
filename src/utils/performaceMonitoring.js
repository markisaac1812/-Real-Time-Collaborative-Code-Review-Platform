import mongoose from 'mongoose';

export class PerformanceMonitor {
  constructor() {
    this.slowQueryThreshold = 100; // milliseconds
    this.metrics = {
      slowQueries: 0,
      totalQueries: 0,
      averageQueryTime: 0,
      queryTimes: []
    };
  }

  // Middleware to monitor query performance
  queryMonitorMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Override res.json to capture response time
      const originalJson = res.json;
      res.json = function(data) {
        const queryTime = Date.now() - startTime;
        
        // Update metrics
        this.updateMetrics(queryTime, req.method, req.path);
        
        // Log slow queries
        if (queryTime > this.slowQueryThreshold) {
          console.warn(`🐌 Slow query detected: ${req.method} ${req.path} - ${queryTime}ms`);
        }

        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }

  updateMetrics(queryTime, method, path) {
    this.metrics.totalQueries++;
    this.metrics.queryTimes.push(queryTime);

    if (queryTime > this.slowQueryThreshold) {
      this.metrics.slowQueries++;
    }

    // Keep only last 1000 query times for average calculation
    if (this.metrics.queryTimes.length > 1000) {
      this.metrics.queryTimes.shift();
    }

    // Calculate average
    this.metrics.averageQueryTime = 
      this.metrics.queryTimes.reduce((sum, time) => sum + time, 0) / 
      this.metrics.queryTimes.length;
  }

  getMetrics() {
    return {
      ...this.metrics,
      slowQueryPercentage: (this.metrics.slowQueries / this.metrics.totalQueries * 100).toFixed(2)
    };
  }

  // Monitor database performance
  async getDatabaseMetrics() {
    try {
      const dbStats = await mongoose.connection.db.stats();
      const serverStatus = await mongoose.connection.db.admin().serverStatus();

      return {
        database: {
          collections: dbStats.collections,
          dataSize: Math.round(dbStats.dataSize / 1024 / 1024), // MB
          indexSize: Math.round(dbStats.indexSize / 1024 / 1024), // MB
          storageSize: Math.round(dbStats.storageSize / 1024 / 1024), // MB
        },
        performance: {
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          network: {
            bytesIn: serverStatus.network.bytesIn,
            bytesOut: serverStatus.network.bytesOut,
            numRequests: serverStatus.network.numRequests
          },
          opcounters: serverStatus.opcounters
        }
      };
    } catch (error) {
      console.error('Failed to get database metrics:', error);
      return null;
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();