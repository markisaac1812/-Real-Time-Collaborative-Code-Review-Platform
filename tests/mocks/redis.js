// Lightweight in-memory Redis mock compatible with our codebase
const store = new Map();
const expirations = new Map(); // key -> timestamp (ms)

const now = () => Date.now();

const isExpired = (key) => {
  const exp = expirations.get(key);
  return exp !== undefined && now() > exp;
};

async function get(key) {
  if (isExpired(key)) {
    store.delete(key);
    expirations.delete(key);
    return null;
  }
  const val = store.get(key);
  return val === undefined ? null : val;
}

async function setex(key, ttlSeconds, value) {
  store.set(key, typeof value === 'string' ? value : String(value));
  expirations.set(key, now() + ttlSeconds * 1000);
  return 'OK';
}

async function incr(key) {
  const current = await get(key);
  const num = current === null ? 0 : parseInt(current, 10) || 0;
  const next = num + 1;
  // Preserve existing TTL if any
  const exp = expirations.get(key);
  store.set(key, String(next));
  if (exp) expirations.set(key, exp);
  return next;
}

async function del(...keys) {
  let count = 0;
  for (const key of keys) {
    if (store.delete(key)) count++;
    expirations.delete(key);
  }
  return count;
}

function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
  return new RegExp(regexStr);
}

async function keys(pattern) {
  const regex = wildcardToRegex(pattern);
  return Array.from(store.keys()).filter((k) => regex.test(k));
}

async function ttl(key) {
  if (isExpired(key)) {
    store.delete(key);
    expirations.delete(key);
    return -2; // key does not exist
  }
  const exp = expirations.get(key);
  if (!exp) return -1; // no expiration
  return Math.max(0, Math.ceil((exp - now()) / 1000));
}

async function ping() { return 'PONG'; }
async function quit() { return 'OK'; }
function on() { /* no-op */ }

async function info() {
  return 'uptime_in_seconds:60\r\nconnected_clients:1';
}

export const redis = { get, setex, incr, del, keys, ttl, ping, quit, on, info };
export const redisSubscriber = redis;
export const redisPublisher = redis;
export const testRedisConnection = async () => true;
export const closeRedisConnections = async () => {};

export default { redis, redisSubscriber, redisPublisher };
