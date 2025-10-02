import request from 'supertest';
import app from '../../src/app.js';

export const signupAndLogin = async (overrides = {}) => {
  const username = overrides.username || `user_${Math.random().toString(36).slice(2, 8)}`;
  const email = overrides.email || `${username}@example.com`;
  const password = overrides.password || 'Str0ngP@ss!';

  const agent = request.agent(app);

  const signupRes = await agent
    .post('/api/auth/signup')
    .send({ username, email, password, confirmPassword: password })
    .expect(201);

  const accessToken = signupRes.body.accessToken;
  return { agent, accessToken, username, email };
};
