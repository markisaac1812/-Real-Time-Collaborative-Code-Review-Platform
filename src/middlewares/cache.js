import crypto from 'crypto';
import  {getCachedSubmissionList, cacheSubmissionList, cacheGet, cacheSet} from '../utils/cache.js';

//Generate cache key from request
const generateCacheKey = (req) => {
  const { query, params, user } = req;
  const keyData = {
    path: req.route?.path || req.path,
    query,
    params,
    userId: user?.id // Include user ID for personalized caches
  };
  
  return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
};

// Generic cache middleware
export const cacheMiddleware = (cacheTtl = 300) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    
    try {
      const cached = await cacheGet(`api:${cacheKey}`);
      
      if (cached) {
        // Add cache hit header
        res.set('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }
      
      // Store original json method
      const originalJson = res.json.bind(res);
      let responseSent = false;
      
      // Override json method to cache response
      res.json = function(data) {
        // Prevent double response
        if (responseSent || res.headersSent) {
          return res;
        }
        responseSent = true;
        
        // Only cache successful responses
        if (res.statusCode === 200) {
          cacheSet(`api:${cacheKey}`, data, cacheTtl).catch(console.error);
        }
        
        // Add cache miss header if headers not sent
        if (!res.headersSent) {
          res.set('X-Cache', 'MISS');
        }
        
        // Call original json method
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Submission list cache middleware
export const submissionListCache = async (req, res, next) => {
  if (req.method !== 'GET') return next();

  const queryHash = generateCacheKey(req);
  const cached = await getCachedSubmissionList(queryHash);
  
  if (cached) {
    res.set('X-Cache', 'HIT');
    return res.status(200).json({
      status: 'success',
      results: cached.submissions.length,
      pagination: cached.pagination,
      data: { submissions: cached.submissions },
      cachedAt: cached.cachedAt
    });
  }

  // Store original response for caching
  req.cacheKey = queryHash;
  next();
};