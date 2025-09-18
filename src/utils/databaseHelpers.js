import User from '../models/userModel.js';
// import CodeSubmission from "./../models/codeSubmission.js"
// import Review from '../models/review.js';
// import mongoose from 'mongoose';

// Update user reputation (existing function - enhanced)
export const updateUserReputation = async(userId, points, action) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    user.reputation.points += points;
    
    // Update specific counters based on action
    switch (action) {
      case 'submission_created':
        // Give points for creating a submission
        break;
      case 'review_given':
        user.reputation.reviewsGiven += 1;
        break;
      case 'review_received':
        user.reputation.reviewsReceived += 1;
        break;
      case 'helpful_vote':
        user.reputation.helpfulVotes += 1;
        break;
    }

    // Update level based on points
    if (user.reputation.points >= 1000) user.reputation.level = "Master";
    else if (user.reputation.points >= 500) user.reputation.level = "Expert";
    else if (user.reputation.points >= 100) user.reputation.level = "Intermediate";
    else user.reputation.level = "Beginner";

    return await user.save();
  } catch (error) {
    console.error('Error updating user reputation:', error);
    return null;
  }
};

// Get code complexity score (basic implementation)
export const calculateCodeComplexity = (code, language) => {
  if (!code) return 1;
  
  let complexity = 1; // Base complexity
  
  // Count lines
  const lines = code.split('\n').length;
  complexity += Math.floor(lines / 10); // +1 for every 10 lines
  
  // Language-specific complexity indicators
  const complexityPatterns = {
    javascript: [
      /function\s+\w+|=>\s*{|async\s+function/g, // Functions
      /if\s*\(|else\s*if\s*\(|switch\s*\(/g, // Conditionals
      /for\s*\(|while\s*\(|do\s*{/g, // Loops
      /try\s*{|catch\s*\(/g, // Error handling
      /class\s+\w+|extends\s+\w+/g, // OOP
    ],
    python: [
      /def\s+\w+|lambda\s+/g, // Functions
      /if\s+.*:|elif\s+.*:|else\s*:/g, // Conditionals
      /for\s+.*:|while\s+.*:/g, // Loops
      /try\s*:|except\s+.*:|finally\s*:/g, // Error handling
      /class\s+\w+/g, // Classes
    ],
    java: [
      /(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/g, // Methods
      /if\s*\(|else\s*if\s*\(|switch\s*\(/g, // Conditionals
      /for\s*\(|while\s*\(|do\s*{/g, // Loops
      /try\s*{|catch\s*\(/g, // Error handling
      /(public|private|protected)?\s*class\s+\w+/g, // Classes
    ]
  };

  const patterns = complexityPatterns[language] || complexityPatterns.javascript;
  
  patterns.forEach(pattern => {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  });

  // Normalize to 1-10 scale
  return Math.min(Math.max(Math.floor(complexity / 5), 1), 10);
};

// Get suggested reviewers for a submission
export const getSuggestedReviewers = async (submission, limit = 5) => {
  try {
    const query = {
      _id: { $ne: submission.author }, // Not the author
      isActive: true,
      'preferences.availableForReview': true
    };

    // Prefer users with matching skills
    if (submission.tags && submission.tags.length > 0) {
      query.skills = { $in: submission.tags };
    }

    const reviewers = await User.find(query)
      .select('username profile reputation skills preferences')
      .sort({ 'reputation.points': -1, 'reputation.reviewsGiven': -1 })
      .limit(limit);

    return reviewers;
  } catch (error) {
    console.error('Error getting suggested reviewers:', error);
    return [];
  }
};

// Update submission analytics
export const updateSubmissionAnalytics = async (submissionId, updateData) => {
  try {
    const submission = await CodeSubmission.findById(submissionId);
    if (!submission) return null;

    // Update analytics fields
    Object.keys(updateData).forEach(key => {
      if (submission.analytics.hasOwnProperty(key)) {
        submission.analytics[key] = updateData[key];
      }
    });

    return await submission.save();
  } catch (error) {
    console.error('Error updating submission analytics:', error);
    return null;
  }
};

// Get trending tags
export const getTrendingTags = async (period = '7d', limit = 20) => {
  try {
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
    }

    const pipeline = [
      {
        $match: {
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          visibility: 'public',
          tags: { $ne: [] }
        }
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          averageViews: { $avg: '$analytics.views' },
          recentSubmissions: { $sum: 1 }
        }
      },
      { $sort: { count: -1, averageViews: -1 } },
      { $limit: limit }
    ];

    return await CodeSubmission.aggregate(pipeline);
  } catch (error) {
    console.error('Error getting trending tags:', error);
    return [];
  }
};