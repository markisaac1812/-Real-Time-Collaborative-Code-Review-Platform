import mongoose from 'mongoose';
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

describe('User Model', () => {
  test('hashes password on save and validates correctPassword', async () => {
    const plain = 'Str0ngP@ss!';
    const user = await User.create({
      username: 'tester1',
      email: 'tester1@example.com',
      password: plain,
      confirmPassword: plain,
    });

    // password should not be returned by default
    const fetched = await User.findOne({ username: 'tester1' }).select('+password');
    expect(fetched).toBeTruthy();
    expect(fetched.password).toBeDefined();
    expect(fetched.password).not.toEqual(plain);

    const ok = await fetched.correctPassword(plain, fetched.password);
    expect(ok).toBe(true);
  });

  test('createPasswordResetToken sets token and expiry', async () => {
    const plain = 'Str0ngP@ss!';
    const user = await User.create({
      username: 'tester2',
      email: 'tester2@example.com',
      password: plain,
      confirmPassword: plain,
    });

    const token = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    expect(typeof token).toBe('string');
    expect(user.passwordResetToken).toBeDefined();
    expect(user.passwordResetExpires).toBeInstanceOf(Date);
  });
});
