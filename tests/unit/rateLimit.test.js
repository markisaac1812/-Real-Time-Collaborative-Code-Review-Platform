import { RedisRateLimiter } from '../../src/utils/rateLimit.js';

function createMockReqRes(ip = '127.0.0.1') {
  const headers = {};
  const res = {
    headersSent: false,
    statusCode: 200,
    set: (k, v) => { headers[k] = v; return res; },
    status: (code) => { res.statusCode = code; return res; },
    json: (data) => ({ statusCode: res.statusCode, headers, body: data })
  };
  const req = { ip };
  const next = jest.fn();
  return { req, res, next };
}

describe('RedisRateLimiter middleware', () => {
  test('allows up to max requests then returns 429', async () => {
    const limiter = new RedisRateLimiter(60_000, 3, (req) => req.ip);
    const mw = limiter.middleware();
    const { req, res, next } = createMockReqRes('1.2.3.4');

    // First 3 should pass
    await mw(req, res, next);
    await mw(req, res, next);
    await mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(3);

    // Fourth should be 429
    const out = await mw(req, res, jest.fn());
    expect(res.statusCode).toBe(429);
  });
});
