import request from 'supertest';
import app from '../../src/app.js';
import { connect, closeDatabase, clearDatabase } from '../utils/testDb.js';

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await closeDatabase();
});

afterEach(async () => {
  await clearDatabase();
});

describe('Auth API', () => {
  test('signup -> login -> refresh', async () => {
    const agent = request.agent(app);

    const signupRes = await agent
      .post('/api/auth/signup')
      .send({
        username: 'john_doe',
        email: 'john_doe@example.com',
        password: 'Str0ngP@ss!',
        confirmPassword: 'Str0ngP@ss!'
      })
      .expect(201);

    expect(signupRes.body.status).toBe('success');
    expect(signupRes.body.accessToken).toBeDefined();

    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'john_doe', password: 'Str0ngP@ss!' })
      .expect(200);

    expect(loginRes.body.accessToken).toBeDefined();

    const refreshRes = await agent
      .post('/api/auth/refresh')
      .expect(200);

    expect(refreshRes.body.accessToken).toBeDefined();
  });
});
