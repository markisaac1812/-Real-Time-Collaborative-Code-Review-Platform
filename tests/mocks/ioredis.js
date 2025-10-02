// Basic ioredis mock in case any direct imports occur
class IORedisMock {
  constructor() {}
  on() { return this; }
  quit() { return Promise.resolve('OK'); }
  get() { return Promise.resolve(null); }
  setex() { return Promise.resolve('OK'); }
  incr() { return Promise.resolve(1); }
  del() { return Promise.resolve(1); }
  keys() { return Promise.resolve([]); }
  ttl() { return Promise.resolve(60); }
  ping() { return Promise.resolve('PONG'); }
  info() { return Promise.resolve('uptime_in_seconds:60\r\nconnected_clients:1'); }
}
export default IORedisMock;
module.exports = IORedisMock;
