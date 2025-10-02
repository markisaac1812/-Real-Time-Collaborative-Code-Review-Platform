import mongoose from 'mongoose';
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

describe('Review Model', () => {
  const baseCategories = {
    codeQuality: 4, performance: 4, security: 4, maintainability: 4, bestPractices: 4
  };

  test('enforces required fields and ranges', async () => {
    const author = await User.create({
      username: 'author', email: 'author@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!'
    });
    const reviewer = await User.create({
      username: 'reviewer', email: 'reviewer@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!'
    });
    const sub = await CodeSubmission.create({
      title: 'T', description: 'Valid description', code: 'x', language: 'javascript', author: author._id
    });

    await expect(Review.create({
      submission: sub._id,
      reviewer: reviewer._id,
      overallFeedback: 'Good',
      rating: 6, // invalid
      categories: baseCategories
    })).rejects.toBeTruthy();
  });

  test('pre-save sets submittedAt when status=submitted', async () => {
    const author = await User.create({
      username: 'author2', email: 'author2@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!'
    });
    const reviewer = await User.create({
      username: 'reviewer2', email: 'reviewer2@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!'
    });
    const sub = await CodeSubmission.create({
      title: 'Test sub', description: 'Valid description', code: 'code', language: 'javascript', author: author._id
    });

    const review = await Review.create({
      submission: sub._id,
      reviewer: reviewer._id,
      overallFeedback: 'Nice',
      rating: 4,
      categories: baseCategories,
      status: 'submitted'
    });

    expect(review.submittedAt).toBeDefined();
  });

  test('toggleHelpful adds and removes user id', async () => {
    const author = await User.create({
      username: 'author3', email: 'author3@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!'
    });
    const reviewer = await User.create({
      username: 'reviewer3', email: 'reviewer3@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!'
    });
    const voter = await User.create({
      username: 'voter', email: 'voter@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!'
    });
    const sub = await CodeSubmission.create({
      title: 'Test sub', description: 'Valid description', code: 'code', language: 'javascript', author: author._id
    });

    let review = await Review.create({
      submission: sub._id,
      reviewer: reviewer._id,
      overallFeedback: 'Ok',
      rating: 3,
      categories: baseCategories
    });

    await review.toggleHelpful(voter._id);
    review = await Review.findById(review._id);
    expect(review.interactions.helpful.map(String)).toContain(String(voter._id));

    await review.toggleHelpful(voter._id);
    review = await Review.findById(review._id);
    expect(review.interactions.helpful.map(String)).not.toContain(String(voter._id));
  });
});
