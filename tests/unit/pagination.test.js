import mongoose from 'mongoose';
import User from '../../src/models/userModel.js';
import CodeSubmission from '../../src/models/CodeSubmission.js';
import { CursorPagination } from '../../src/utils/pagination.js';
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

describe('CursorPagination', () => {
  test('paginates forward using cursor', async () => {
    const user = await User.create({ username: 'puser', email: 'puser@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!' });

    const docs = [];
    for (let i = 0; i < 5; i++) {
      docs.push({ title: 't'+i, description: 'desc for '+i, code: 'x', language: 'javascript', author: user._id });
    }
    await CodeSubmission.insertMany(docs);

    const pager = new CursorPagination(CodeSubmission, '_id', 1);
    const page1 = await pager.paginate({}, null, 2);
    expect(page1.results.length).toBe(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await pager.paginate({}, page1.nextCursor, 2);
    expect(page2.results.length).toBe(2);
    const page3 = await pager.paginate({}, page2.nextCursor, 2);
    expect(page3.results.length).toBe(1);
    expect(page3.hasMore).toBe(false);
  });
});
