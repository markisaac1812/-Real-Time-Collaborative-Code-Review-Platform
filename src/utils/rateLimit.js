import {redis } from "../config/redis.js";

// Redis-based rate limiter
export class RedisRateLimiter {
    constructor(windowMs = 900000, max = 100, keyGenerator = null) {
      this.windowMs = windowMs; // Time window in milliseconds
      this.max = max; // Maximum requests per window
      this.keyGenerator = keyGenerator || ((req) => req.ip);
    }
  
    middleware() {
      return async (req, res, next) => {
        try {
          const key = `ratelimit:${this.keyGenerator(req)}`;
          const current = await redis.get(key);
          
          if (current === null) {
            // First request in window
            await redis.setex(key, Math.ceil(this.windowMs / 1000), 1);
            res.set('X-RateLimit-Limit', this.max);
            res.set('X-RateLimit-Remaining', this.max - 1);
            return next();
          }
          
          const count = parseInt(current, 10);
          const ttl = await redis.ttl(key);
          
          if (count >= this.max) {
            res.set('X-RateLimit-Limit', this.max);
            res.set('X-RateLimit-Remaining', 0);
            res.set('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000));
            
            return res.status(429).json({
              status: 'error',
              message: 'Too many requests, please try again later',
              retryAfter: ttl
            });
          }
          
          // Increment counter
          await redis.incr(key);
          
          res.set('X-RateLimit-Limit', this.max);
          res.set('X-RateLimit-Remaining', this.max - count - 1);
          
          next();
        } catch (error) {
          console.error('Rate limiting error:', error);
          next(); // Fail open on Redis errors
        }
      };
    }
  }
  
  // Create rate limiter instances
  export const apiRateLimiter = new RedisRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
  export const authRateLimiter = new RedisRateLimiter(15 * 60 * 1000, 5); // 5 auth attempts per 15 minutes
  export const submitRateLimiter = new RedisRateLimiter(60 * 60 * 1000, 10); // 10 submissions per hour
  
  // WebSocket rate limiting
  export const socketRateLimiter = async (socketId, maxRequests = 100, windowMs = 60000) => {
    const key = `socket:ratelimit:${socketId}`;
    
    try {
      const current = await redis.get(key);
      
      if (!current) {
        await redis.setex(key, Math.ceil(windowMs / 1000), 1);
        return { allowed: true, remaining: maxRequests - 1 };
      }
      
      const count = parseInt(current, 10);
      
      if (count >= maxRequests) {
        return { allowed: false, remaining: 0 };
      }
      
      await redis.incr(key);
      return { allowed: true, remaining: maxRequests - count - 1 };
    } catch (error) {
      console.error('Socket rate limiting error:', error);
      return { allowed: true, remaining: maxRequests }; // Fail open
    }
  };