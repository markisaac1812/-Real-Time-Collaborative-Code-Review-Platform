import mongoose from 'mongoose';
import Comment from '../../src/models/comment.js';
import Review from '../../src/models/Review.js';
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

describe('Comment Model', () => {
  test('creates comment and tracks edit history on update', async () => {
    const author = await User.create({ username: 'u1', email: 'u1@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!' });
    const reviewer = await User.create({ username: 'u2', email: 'u2@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!' });
    const sub = await CodeSubmission.create({ title: 'Title ok', description: 'Description long enough', code: 'x', language: 'javascript', author: author._id });
    const review = await Review.create({ submission: sub._id, reviewer: reviewer._id, overallFeedback: 'ok', rating: 4, categories: { codeQuality:4, performance:4, security:4, maintainability:4, bestPractices:4 } });

    const c = await Comment.create({ review: review._id, author: author._id, content: 'first' });
    expect(c.isEdited).toBe(false);
    c.content = 'edited';
    await c.save();
    expect(c.isEdited).toBe(true);
    expect(c.editHistory.length).toBeGreaterThan(0);
  });
});
