export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  clearMocks: true,
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(.*/)??config/redis\\.js$': '<rootDir>/tests/mocks/redis.js',
    '^ioredis$': '<rootDir>/tests/mocks/ioredis.js'
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/sockets/**'
  ],
  coverageDirectory: '<rootDir>/coverage'
};
