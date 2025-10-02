import mongoose from 'mongoose';
import User from '../../src/models/userModel.js';
import { updateUserReputation, calculateCodeComplexity } from '../../src/utils/databaseHelpers.js';
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

describe('databaseHelpers', () => {
  test('updateUserReputation adjusts points and counters', async () => {
    const user = await User.create({
      username: 'repuser',
      email: 'repuser@example.com',
      password: 'Str0ngP@ss!',
      confirmPassword: 'Str0ngP@ss!'
    });

    await updateUserReputation(user._id, 120, 'review_given');
    const fresh = await User.findById(user._id);
    expect(fresh.reputation.points).toBe(120);
    expect(fresh.reputation.reviewsGiven).toBe(1);
    expect(fresh.reputation.level).toBe('Intermediate');
  });

  test('calculateCodeComplexity produces 1-10 scale', () => {
    const code = `function a(){}\nif(true){return 1;}\nfor(let i=0;i<10;i++){}`;
    const score = calculateCodeComplexity(code, 'javascript');
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(10);
  });
});
