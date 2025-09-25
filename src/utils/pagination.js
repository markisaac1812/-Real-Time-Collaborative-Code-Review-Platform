// Cursor-based pagination for better performance on large datasets
export class CursorPagination {
    constructor(Model, sortField = '_id', sortOrder = 1) {
      this.Model = Model;
      this.sortField = sortField;
      this.sortOrder = sortOrder;
    }
  
    async paginate(query = {}, cursor = null, limit = 20) {
      // Add cursor condition to query
      if (cursor) {
        const cursorCondition = this.sortOrder === 1 
          ? { [this.sortField]: { $gt: cursor } }
          : { [this.sortField]: { $lt: cursor } };
        
        query = { ...query, ...cursorCondition };
      }
  
      // Execute query
      const results = await this.Model
        .find(query)
        .sort({ [this.sortField]: this.sortOrder })
        .limit(limit + 1)
        .lean()
        .exec();
  
      // Check if there are more results
      const hasMore = results.length > limit;
      if (hasMore) {
        results.pop(); // Remove the extra result
      }
  
      // Get next cursor
      const nextCursor = results.length > 0 
        ? results[results.length - 1][this.sortField]
        : null;
  
      return {
        results,
        nextCursor: hasMore ? nextCursor : null,
        hasMore
      };
    }
  }
  
  // Optimized pagination with total count caching
  export class OptimizedPagination {
    constructor(Model, cacheKeyPrefix) {
      this.Model = Model;
      this.cacheKeyPrefix = cacheKeyPrefix;
    }
  
    async paginate(query, page = 1, limit = 10, useCache = true) {
      const skip = (page - 1) * limit;
      
      // Generate cache key for total count
      const queryHash = this.generateQueryHash(query);
      const countCacheKey = `${this.cacheKeyPrefix}:count:${queryHash}`;
  
      let totalCount;
  
      if (useCache) {
        // Try to get cached count
        totalCount = await cacheGet(countCacheKey);
      }
  
      // Execute query and count
      const promises = [
        this.Model.find(query).skip(skip).limit(limit).lean().exec()
      ];
  
      if (totalCount === null || totalCount === undefined) {
        promises.push(this.Model.countDocuments(query));
      }
  
      const [results, count] = await Promise.all(promises);
      
      if (count !== undefined) {
        totalCount = count;
        if (useCache) {
          // Cache the count for 5 minutes
          await cacheSet(countCacheKey, totalCount, 300);
        }
      }
  
      const totalPages = Math.ceil(totalCount / limit);
  
      return {
        results,
        pagination: {
          currentPage: page,
          totalPages,
          totalResults: totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit,
          skip
        }
      };
    }
  
    generateQueryHash(query) {
      return require('crypto')
        .createHash('md5')
        .update(JSON.stringify(query))
        .digest('hex');
    }
  }