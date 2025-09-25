import mongoose from 'mongoose';

// Query builder for optimized submissions fetching
export class SubmissionQueryBuilder {
  constructor() {
    this.query = {};
    this.sortOptions = { createdAt: -1 };
    this.populateOptions = [];
    this.selectFields = null;
  }

  // Add filters
  byAuthor(authorId) {
    this.query.author = authorId;
    return this;
  }

  byLanguage(language) {
    this.query.language = language;
    return this;
  }

  byStatus(status) {
    this.query.status = status;
    return this;
  }

  byVisibility(visibility) {
    this.query.visibility = visibility;
    return this;
  }

  byTags(tags) {
    this.query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    return this;
  }

  byDateRange(startDate, endDate) {
    this.query.createdAt = {};
    if (startDate) this.query.createdAt.$gte = new Date(startDate);
    if (endDate) this.query.createdAt.$lte = new Date(endDate);
    return this;
  }

  byRatingRange(minRating, maxRating) {
    this.query['analytics.averageRating'] = {};
    if (minRating) this.query['analytics.averageRating'].$gte = minRating;
    if (maxRating) this.query['analytics.averageRating'].$lte = maxRating;
    return this;
  }

  // Sorting options
  sortByNewest() {
    this.sortOptions = { createdAt: -1 };
    return this;
  }

  sortByOldest() {
    this.sortOptions = { createdAt: 1 };
    return this;
  }

  sortByViews() {
    this.sortOptions = { 'analytics.views': -1 };
    return this;
  }

  sortByRating() {
    this.sortOptions = { 'analytics.averageRating': -1, 'analytics.completedReviews': -1 };
    return this;
  }

  // Population options
  withAuthor() {
    this.populateOptions.push({
      path: 'author',
      select: 'username profile reputation',
      options: { lean: true }
    });
    return this;
  }

  withReviewers() {
    this.populateOptions.push({
      path: 'reviewers.user',
      select: 'username profile reputation',
      options: { lean: true }
    });
    return this;
  }

  withReviews() {
    this.populateOptions.push({
      path: 'reviews',
      options: { lean: true },
      populate: {
        path: 'reviewer',
        select: 'username profile reputation',
        options: { lean: true }
      }
    });
    return this;
  }

  // Field selection for performance
  selectFields(fields) {
    this.selectFields = fields;
    return this;
  }

  // Execute query with optimization
  async execute(Model, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Build the query
    let query = Model.find(this.query);

    // Apply field selection
    if (this.selectFields) {
      query = query.select(this.selectFields);
    }

    // Apply population
    this.populateOptions.forEach(populateOption => {
      query = query.populate(populateOption);
    });

    // Apply sorting and pagination
    query = query.sort(this.sortOptions).skip(skip).limit(limit);

    // Use lean() for better performance (returns plain objects)
    query = query.lean();

    // Execute query and count in parallel
    const [results, totalCount] = await Promise.all([
      query.exec(),
      Model.countDocuments(this.query)
    ]);

    return {
      results,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalResults: totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
        limit
      }
    };
  }
}

// Aggregation pipeline builder for complex queries
export class AggregationBuilder {
  constructor(Model) {
    this.Model = Model;
    this.pipeline = [];
  }

  match(conditions) {
    this.pipeline.push({ $match: conditions });
    return this;
  }

  lookup(from, localField, foreignField, as) {
    this.pipeline.push({
      $lookup: { from, localField, foreignField, as }
    });
    return this;
  }

  unwind(path, preserveNullAndEmptyArrays = false) {
    this.pipeline.push({
      $unwind: { 
        path, 
        preserveNullAndEmptyArrays 
      }
    });
    return this;
  }

  group(groupBy) {
    this.pipeline.push({ $group: groupBy });
    return this;
  }

  sort(sortBy) {
    this.pipeline.push({ $sort: sortBy });
    return this;
  }

  project(projection) {
    this.pipeline.push({ $project: projection });
    return this;
  }

  limit(count) {
    this.pipeline.push({ $limit: count });
    return this;
  }

  skip(count) {
    this.pipeline.push({ $skip: count });
    return this;
  }

  addFields(fields) {
    this.pipeline.push({ $addFields: fields });
    return this;
  }

  async execute() {
    return await this.Model.aggregate(this.pipeline).exec();
  }

  async executeFaceted(countPipeline = null) {
    const facetPipeline = {
      results: [...this.pipeline],
      totalCount: countPipeline || [
        ...this.pipeline.filter(stage => !stage.$skip && !stage.$limit),
        { $count: 'count' }
      ]
    };

    const [result] = await this.Model.aggregate([
      { $facet: facetPipeline }
    ]).exec();

    const totalCount = result.totalCount[0]?.count || 0;
    return {
      results: result.results,
      totalCount
    };
  }
}