import User from '../../src/models/userModel.js';
import CodeSubmission from '../../src/models/CodeSubmission.js';
import { SubmissionQueryBuilder, AggregationBuilder } from '../../src/utils/queryOptimization.js';
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

describe('queryOptimization builders', () => {
  test('SubmissionQueryBuilder executes filtered query', async () => {
    const author = await User.create({ username: 'authorQ', email: 'authorQ@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!' });
    await CodeSubmission.create({ title: 'A', description: 'desc', code: 'x', language: 'javascript', author: author._id });
    await CodeSubmission.create({ title: 'B', description: 'desc', code: 'x', language: 'python', author: author._id });

    const qb = new SubmissionQueryBuilder()
      .byAuthor(author._id)
      .byLanguage('javascript')
      .withAuthor()
      .sortByNewest();

    const { results, pagination } = await qb.execute(CodeSubmission, 1, 10);
    expect(results.length).toBe(1);
    expect(pagination.totalResults).toBe(1);
  });

  test('AggregationBuilder runs a simple pipeline', async () => {
    const author = await User.create({ username: 'authorR', email: 'authorR@example.com', password: 'Str0ngP@ss!', confirmPassword: 'Str0ngP@ss!' });
    await CodeSubmission.create({ title: 'A', description: 'desc', code: 'x', language: 'javascript', author: author._id });
    await CodeSubmission.create({ title: 'B', description: 'desc', code: 'x', language: 'javascript', author: author._id });

    const ab = new AggregationBuilder(CodeSubmission)
      .match({ language: 'javascript' })
      .group({ _id: '$language', count: { $sum: 1 } });

    const out = await ab.execute();
    expect(out[0].count).toBe(2);
  });
});
