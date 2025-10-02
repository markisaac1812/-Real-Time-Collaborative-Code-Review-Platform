import {
  cacheSet,
  cacheGet,
  cacheDelete,
  cacheDeletePattern,
  cacheUserProfile,
  getCachedUserProfile,
  cacheSubmissionList,
  getCachedSubmissionList
} from '../../src/utils/cache.js';

describe('Cache utils (mocked Redis)', () => {
  test('cacheSet/cacheGet roundtrip', async () => {
    const ok = await cacheSet('test:key', { a: 1 }, 60);
    expect(ok).toBe(true);
    const val = await cacheGet('test:key');
    expect(val).toEqual({ a: 1 });
  });

  test('cacheDelete removes key', async () => {
    await cacheSet('test:del', { x: 1 }, 60);
    await cacheDelete('test:del');
    const val = await cacheGet('test:del');
    expect(val).toBeNull();
  });

  test('cacheDeletePattern deletes matching keys', async () => {
    await cacheSet('pfx:1', 1, 60);
    await cacheSet('pfx:2', 2, 60);
    await cacheSet('other:3', 3, 60);
    const deleted = await cacheDeletePattern('pfx:*');
    expect(deleted).toBeGreaterThanOrEqual(2);
  });

  test('domain helpers cache user profile and submission list', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const profile = { username: 'u', rep: 10 };
    await cacheUserProfile(userId, profile);
    const got = await getCachedUserProfile(userId);
    expect(got).toEqual(profile);

    const hash = 'qhash1';
    const subs = [{ id: 1 }];
    const pagination = { page: 1 };
    await cacheSubmissionList(hash, subs, pagination);
    const list = await getCachedSubmissionList(hash);
    expect(list).toMatchObject({ submissions: subs, pagination });
  });
});
