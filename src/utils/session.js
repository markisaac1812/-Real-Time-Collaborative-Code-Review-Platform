import { redis } from '../config/redis.js';

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 24 * 60 * 60; // 24 hours

export const createSession = async (userId, sessionData) => {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const key = `${SESSION_PREFIX}${sessionId}`;
  
  const data = {
    userId,
    createdAt: new Date(),
    ...sessionData
  };
  
  await redis.setex(key, SESSION_TTL, JSON.stringify(data));
  return sessionId;
};

export const getSession = async (sessionId) => {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

export const updateSession = async (sessionId, sessionData) => {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const existing = await getSession(sessionId);
  
  if (!existing) return false;
  
  const updated = {
    ...existing,
    ...sessionData,
    updatedAt: new Date()
  };
  
  await redis.setex(key, SESSION_TTL, JSON.stringify(updated));
  return true;
};

export const deleteSession = async (sessionId) => {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const deleted = await redis.del(key);
  return deleted > 0;
};

export const getUserSessions = async (userId) => {
  const pattern = `${SESSION_PREFIX}*`;
  const keys = await redis.keys(pattern);
  const sessions = [];
  
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const session = JSON.parse(data);
      if (session.userId === userId) {
        sessions.push({
          sessionId: key.replace(SESSION_PREFIX, ''),
          ...session
        });
      }
    }
  }
  
  return sessions;
};

// Clean up expired sessions (run periodically)
export const cleanupExpiredSessions = async () => {
  const pattern = `${SESSION_PREFIX}*`;
  const keys = await redis.keys(pattern);
  let cleaned = 0;
  
  for (const key of keys) {
    const ttl = await redis.ttl(key);
    if (ttl <= 0) {
      await redis.del(key);
      cleaned++;
    }
  }
  
  console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
  return cleaned;
};
