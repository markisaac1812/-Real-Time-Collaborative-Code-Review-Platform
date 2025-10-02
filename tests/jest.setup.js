process.env.NODE_ENV = 'test';

// Minimal env needed by the app/controllers
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_TOKEN = process.env.JWT_REFRESH_TOKEN || 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Silence noisy logs during tests
const noop = () => {};
if (!process.env.DEBUG_TEST_LOGS) {
  jest.spyOn(console, 'log').mockImplementation(noop);
  jest.spyOn(console, 'info').mockImplementation(noop);
  jest.spyOn(console, 'warn').mockImplementation(noop);
}

// Ensure timers don't leak between tests
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
