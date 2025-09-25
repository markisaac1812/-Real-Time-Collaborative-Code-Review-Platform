import { SubmissionQueryBuilder, AggregationBuilder } from '../utils/queryOptimization.js';
import { getCachedSubmissionList, cacheSubmissionList } from '../utils/cache.js';
import { OptimizedPagination } from '../utils/pagination.js';

// Optimized get submissions with caching
export const getOptimizedSubmissions = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    language,
    author,
    status,
    sortBy = 'newest',
    tags,
    minRating,
    maxRating,
    dateFrom,
    dateTo
  } = req.query;

  // Generate cache key
  const cacheKey = `submissions:${JSON.stringify(req.query)}`;
  
  // Try to get cached results
  const cached = await getCachedSubmissionList(cacheKey);
  if (cached) {
    return res.status(200).json({
      status: 'success',
      results: cached.submissions.length,
      pagination: cached.pagination,
      data: { submissions: cached.submissions },
      cached: true
    });
  }

  // Build optimized query
  const queryBuilder = new SubmissionQueryBuilder()
    .byVisibility('public')
    .withAuthor();

  // Apply filters
  if (language) queryBuilder.byLanguage(language);
  if (author) queryBuilder.byAuthor(author);
  if (status && status !== 'all') queryBuilder.byStatus(status);
  if (tags) queryBuilder.byTags(tags.split(','));
  if (minRating || maxRating) queryBuilder.byRatingRange(minRating, maxRating);
  if (dateFrom || dateTo) queryBuilder.byDateRange(dateFrom, dateTo);

  // Apply sorting
  switch (sortBy) {
    case 'oldest':
      queryBuilder.sortByOldest();
      break;
    case 'views':
      queryBuilder.sortByViews();
      break;
    case 'rating':
      queryBuilder.sortByRating();
      break;
    default:
      queryBuilder.sortByNewest();
  }

  // Execute query
  const { results, pagination } = await queryBuilder.execute(
    CodeSubmission, 
    parseInt(page), 
    parseInt(limit)
  );

  // Cache results
  await cacheSubmissionList(cacheKey, results, pagination);

  res.status(200).json({
    status: 'success',
    results: results.length,
    pagination,
    data: { submissions: results },
    cached: false
  });
});

// Optimized search with aggregation
export const getOptimizedSearch = catchAsync(async (req, res, next) => {
  const {
    q,
    page = 1,
    limit = 10,
    language,
    category,
    minRating
  } = req.query;

  if (!q || q.trim().length < 2) {
    return next(new AppError('Search query must be at least 2 characters', 400));
  }

  // Check cache first
  const cacheKey = `search:${JSON.stringify(req.query)}`;
  const cached = await getCachedSearchResults(cacheKey);
  
  if (cached) {
    return res.status(200).json({
      ...cached,
      cached: true
    });
  }

  // Build aggregation pipeline for advanced search
  const aggregationBuilder = new AggregationBuilder(CodeSubmission)
    .match({
      visibility: 'public',
      $text: { $search: q },
      ...(language && { language }),
      ...(category && { category }),
      ...(minRating && { 'analytics.averageRating': { $gte: parseFloat(minRating) } })
    })
    .addFields({
      searchScore: { $meta: 'textScore' },
      relevanceScore: {
        $add: [
          { $meta: 'textScore' },
          { $multiply: [{ $ifNull: ['$analytics.views', 0] }, 0.01] },
          { $multiply: [{ $ifNull: ['$analytics.averageRating', 0] }, 2] }
        ]
      }
    })
    .lookup('users', 'author', '_id', 'authorInfo')
    .unwind('authorInfo', true)
    .project({
      title: 1,
      description: 1,
      language: 1,
      tags: 1,
      analytics: 1,
      createdAt: 1,
      searchScore: 1,
      relevanceScore: 1,
      author: {
        _id: '$authorInfo._id',
        username: '$authorInfo.username',
        profile: '$authorInfo.profile',
        reputation: '$authorInfo.reputation'
      }
    })
    .sort({ relevanceScore: -1, searchScore: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  // Execute with faceted aggregation for count
  const { results, totalCount } = await aggregationBuilder.executeFaceted();

  const pagination = {
    currentPage: parseInt(page),
    totalPages: Math.ceil(totalCount / limit),
    totalResults: totalCount,
    hasNext: page * limit < totalCount,
    hasPrev: page > 1,
    limit: parseInt(limit)
  };

  const response = {
    status: 'success',
    query: q,
    results: results.length,
    pagination,
    data: { submissions: results },
    cached: false
  };

  // Cache results
  await cacheSearchResults(cacheKey, response);

  res.status(200).json(response);
});