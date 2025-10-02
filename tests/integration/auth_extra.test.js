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

describe('Auth extra flows', () => {
  test('logout clears refresh cookie and deactivate blocks future login', async () => {
    const agent = request.agent(app);

    const password = 'Str0ngP@ss!';
    const signup = await agent
      .post('/api/auth/signup')
      .send({ username: 'logoutuser', email: 'logout@example.com', password, confirmPassword: password })
      .expect(201);

    const token = signup.body.accessToken;

    // logout requires protect
    await agent
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // deactivate
    await agent
      .post('/api/auth/deactivate')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // login again should be forbidden
    await agent
      .post('/api/auth/login')
      .send({ username: 'logoutuser', password })
      .expect(403);
  });
});
