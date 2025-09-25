import { analyticsQueue } from '../config/queue.js';
import User from '../models/userModel.js';
import CodeSubmission from '../models/codeSubmissionModel.js';
import Review from '../models/reviewModel.js';
import { cacheSet, cacheDelete } from '../utils/cache.js';

// Process analytics calculations
analyticsQueue.process('calculate-daily-stats', 2, async (job) => {
  const { date = new Date() } = job.data;
  
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Calculate daily statistics
    const [
      totalUsers,
      activeUsers,
      newSubmissions,
      completedReviews,
      newComments
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ 
        lastLogin: { $gte: startOfDay, $lte: endOfDay }
      }),
      CodeSubmission.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }),
      Review.countDocuments({
        status: 'submitted',
        submittedAt: { $gte: startOfDay, $lte: endOfDay }
      }),
      Comment.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      })
    ]);

    // Calculate language popularity
    const languageStats = await CodeSubmission.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const analytics = {
      date: date.toISOString().split('T')[0],
      totalUsers,
      activeUsers,
      newSubmissions,
      completedReviews,
      newComments,
      languageStats,
      calculatedAt: new Date()
    };

    // Cache analytics
    await cacheSet(`analytics:daily:${analytics.date}`, analytics, 24 * 3600); // Cache for 24 hours
    
    return analytics;
  } catch (error) {
    console.error('Analytics calculation failed:', error);
    throw error;
  }
});

// Process user activity analytics
analyticsQueue.process('calculate-user-activity', 3, async (job) => {
  const { userId, period = 30 } = job.data; // Default 30 days
  
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  // Calculate user activity metrics
  const [submissions, reviews, comments] = await Promise.all([
    CodeSubmission.find({ 
      author: userId, 
      createdAt: { $gte: startDate } 
    }).select('createdAt analytics.views language'),
    
    Review.find({ 
      reviewer: userId, 
      status: 'submitted',
      submittedAt: { $gte: startDate } 
    }).select('submittedAt rating interactions.helpful'),
    
    Comment.find({ 
      author: userId, 
      createdAt: { $gte: startDate } 
    }).select('createdAt reactions')
  ]);

  const activity = {
    userId,
    period,
    submissions: {
      count: submissions.length,
      totalViews: submissions.reduce((sum, s) => sum + (s.analytics?.views || 0), 0),
      languages: [...new Set(submissions.map(s => s.language))]
    },
    reviews: {
      count: reviews.length,
      averageRating: reviews.length > 0 ? 
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
      totalHelpful: reviews.reduce((sum, r) => sum + (r.interactions?.helpful?.length || 0), 0)
    },
    comments: {
      count: comments.length,
      totalLikes: comments.reduce((sum, c) => sum + (c.reactions?.likes?.length || 0), 0)
    },
    calculatedAt: new Date()
  };

  // Cache user activity
  await cacheSet(`user:activity:${userId}:${period}d`, activity, 3600); // Cache for 1 hour

  return activity;
});

export const queueDailyAnalytics = async (date = new Date()) => {
  return await analyticsQueue.add('calculate-daily-stats', { date });
};

export const queueUserActivityCalculation = async (userId, period = 30) => {
  return await analyticsQueue.add('calculate-user-activity', { userId, period });
};