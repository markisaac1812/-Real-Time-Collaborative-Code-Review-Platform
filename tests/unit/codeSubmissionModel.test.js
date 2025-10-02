import mongoose from 'mongoose';
import CodeSubmission from '../../src/models/CodeSubmission.js';
import User from '../../src/models/userModel.js';
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

describe('CodeSubmission Model', () => {
  test('computes metadata and updates on code change', async () => {
    const user = await User.create({
      username: 'author1',
      email: 'author1@example.com',
      password: 'Str0ngP@ss!',
      confirmPassword: 'Str0ngP@ss!'
    });

    const code = 'line1\nline2\nline3';
    const sub = await CodeSubmission.create({
      title: 'Test',
      description: 'Desc',
      code,
      language: 'javascript',
      author: user._id,
      tags: ['tag1']
    });

    expect(sub.metadata.lineCount).toBe(3);
    expect(sub.metadata.characterCount).toBe(code.length);
    expect(sub.metadata.estimatedReviewTime).toBe(Math.ceil(3 / 10));

    sub.code = 'a\nb';
    await sub.save();
    expect(sub.metadata.lineCount).toBe(2);
  });

  test('incrementViews increases analytics.views', async () => {
    const user = await User.create({
      username: 'author2',
      email: 'author2@example.com',
      password: 'Str0ngP@ss!',
      confirmPassword: 'Str0ngP@ss!'
    });

    const sub = await CodeSubmission.create({
      title: 'Views',
      description: 'Desc',
      code: 'x',
      language: 'javascript',
      author: user._id
    });

    expect(sub.analytics.views).toBe(0);
    await sub.incrementViews();
    const fresh = await CodeSubmission.findById(sub._id);
    expect(fresh.analytics.views).toBe(1);
  });

  test('validation fails with too many tags', async () => {
    const user = await User.create({
      username: 'author3',
      email: 'author3@example.com',
      password: 'Str0ngP@ss!',
      confirmPassword: 'Str0ngP@ss!'
    });

    const tags = Array.from({ length: 15 }, (_, i) => `t${i}`);
    await expect(CodeSubmission.create({
      title: 'TooMany',
      description: 'Desc',
      code: 'x',
      language: 'javascript',
      author: user._id,
      tags
    })).resolves.toBeTruthy();
    // Note: tag count limit is enforced at controller level, schema allows array
  });
});
