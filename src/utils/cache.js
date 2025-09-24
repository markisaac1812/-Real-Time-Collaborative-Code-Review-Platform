import {redis } from "../config/redis.js";

// Cache configuration
const CACHE_CONFIG = {
    USER_PROFILE: { ttl: 3600, prefix: 'user:profile:' }, // 1 hour
    SUBMISSION_LIST: { ttl: 300, prefix: 'submissions:list:' }, // 5 minutes
    REVIEW_STATS: { ttl: 1800, prefix: 'review:stats:' }, // 30 minutes
    LEADERBOARD: { ttl: 900, prefix: 'leaderboard:' }, // 15 minutes
    ONLINE_USERS: { ttl: 60, prefix: 'online:users:' }, // 1 minute
    SUBMISSION_DETAIL: { ttl: 600, prefix: 'submission:detail:' }, // 10 minutes
    USER_NOTIFICATIONS: { ttl: 120, prefix: 'user:notifications:' }, // 2 minutes
    SEARCH_RESULTS: { ttl: 180, prefix: 'search:' }, // 3 minutes
  };
  
  // Generic cache get/set functions
  export const cacheGet = async (key) => {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  };
  
  export const cacheSet = async (key, value, ttl = 3600) => {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  };
  
  export const cacheDelete = async (key) => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  };
  
  export const cacheDeletePattern = async (pattern) => {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  };
  
  // Specific cache functions
  export const cacheUserProfile = async (userId, userData) => {
    const key = `${CACHE_CONFIG.USER_PROFILE.prefix}${userId}`;
    return await cacheSet(key, userData, CACHE_CONFIG.USER_PROFILE.ttl);
  };
  
  export const getCachedUserProfile = async (userId) => {
    const key = `${CACHE_CONFIG.USER_PROFILE.prefix}${userId}`;
    return await cacheGet(key);
  };
  
  export const cacheSubmissionList = async (queryHash, submissions, pagination) => {
    const key = `${CACHE_CONFIG.SUBMISSION_LIST.prefix}${queryHash}`;
    const data = { submissions, pagination, cachedAt: new Date() };
    return await cacheSet(key, data, CACHE_CONFIG.SUBMISSION_LIST.ttl);
  };
  
  export const getCachedSubmissionList = async (queryHash) => {
    const key = `${CACHE_CONFIG.SUBMISSION_LIST.prefix}${queryHash}`;
    return await cacheGet(key);
  };
  
  export const cacheLeaderboard = async (type, users) => {
    const key = `${CACHE_CONFIG.LEADERBOARD.prefix}${type}`;
    return await cacheSet(key, users, CACHE_CONFIG.LEADERBOARD.ttl);
  };
  
  export const getCachedLeaderboard = async (type) => {
    const key = `${CACHE_CONFIG.LEADERBOARD.prefix}${type}`;
    return await cacheGet(key);
  };
  
  export const cacheSearchResults = async (queryHash, results) => {
    const key = `${CACHE_CONFIG.SEARCH_RESULTS.prefix}${queryHash}`;
    return await cacheSet(key, results, CACHE_CONFIG.SEARCH_RESULTS.ttl);
  };
  
  export const getCachedSearchResults = async (queryHash) => {
    const key = `${CACHE_CONFIG.SEARCH_RESULTS.prefix}${queryHash}`;
    return await cacheGet(key);
  };
  
  // Cache invalidation helpers
  export const invalidateUserCache = async (userId) => {
    const patterns = [
      `${CACHE_CONFIG.USER_PROFILE.prefix}${userId}`,
      `${CACHE_CONFIG.USER_NOTIFICATIONS.prefix}${userId}`,
      `${CACHE_CONFIG.LEADERBOARD.prefix}*`,
      `${CACHE_CONFIG.SUBMISSION_LIST.prefix}*`
    ];
    
    for (const pattern of patterns) {
      await cacheDeletePattern(pattern);
    }
  };
  
  export const invalidateSubmissionCache = async (submissionId) => {
    const patterns = [
      `${CACHE_CONFIG.SUBMISSION_DETAIL.prefix}${submissionId}`,
      `${CACHE_CONFIG.SUBMISSION_LIST.prefix}*`,
      `${CACHE_CONFIG.SEARCH_RESULTS.prefix}*`
    ];
    
    for (const pattern of patterns) {
      await cacheDeletePattern(pattern);
    }
  };