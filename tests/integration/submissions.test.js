import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/userModel.js';
import CodeSubmission from '../../src/models/CodeSubmission.js';
import { connect, closeDatabase, clearDatabase } from '../utils/testDb.js';
import { signupAndLogin } from '../helpers/auth.js';

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await closeDatabase();
});

afterEach(async () => {
  await clearDatabase();
});

describe('Submissions API (CRUD)', () => {
  test('create -> get list -> get by id -> update -> delete (soft) flow', async () => {
    // Author user
    const { agent: authorAgent, accessToken: authorToken } = await signupAndLogin({ username: 'authorX' });

    // Create a submission
    const createRes = await authorAgent
      .post('/api/submissions')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'My First Submission',
        description: 'This is a valid description for testing.',
        code: 'console.log(42);',
        language: 'javascript',
        tags: ['testing', 'js'],
        category: 'learning',
        priority: 'medium',
        visibility: 'public'
      })
      .expect(201);

    const submissionId = createRes.body.data._id || createRes.body.data.id || createRes.body.data._id || createRes.body.data?.data?._id;
    const created = createRes.body.data;
    expect(created).toBeTruthy();

    // List submissions (public GET)
    const listRes = await request(app)
      .get('/api/submissions')
      .expect(200);
    expect(listRes.body.results).toBe(1);

    // Get by id (public GET)
    const getRes = await request(app)
      .get(`/api/submissions/${created._id}`)
      .expect(200);
    expect(getRes.body.data.submission.title).toBe('My First Submission');

    // Update by another user should 403
    const { agent: otherAgent, accessToken: otherToken } = await signupAndLogin({ username: 'otherY' });
    await otherAgent
      .put(`/api/submissions/${created._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hacked' })
      .expect(403);

    // Update by author should succeed
    const updRes = await authorAgent
      .put(`/api/submissions/${created._id}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: 'Updated Title' })
      .expect(200);
    expect(updRes.body.data.submission.title).toBe('Updated Title');

    // Toggle visibility to private
    await authorAgent
      .put(`/api/submissions/${created._id}/visibility`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ visibility: 'private' })
      .expect(200);

    // Now public GET by anonymous should 403
    await request(app)
      .get(`/api/submissions/${created._id}`)
      .expect(403);

    // Delete (soft close)
    const delRes = await authorAgent
      .delete(`/api/submissions/${created._id}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .expect(200);
    expect(delRes.body.message).toMatch(/deleted/i);

    const closed = await CodeSubmission.findById(created._id);
    expect(closed.status).toBe('closed');
  });
});
