import mongoose from "mongoose";
import Review from "../models/Review.js";
import CodeSubmission from "../models/CodeSubmission.js";
import User from "../models/userModel.js";
import Comment from "../models/comment.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { updateUserReputation } from "../utils/databaseHelpers.js";

export const createReview = catchAsync(async (req, res, next) => {
    const submissionId = req.params.submissionId;
    const {
        overallFeedback,
        rating,
        lineComments,
        categories,
        suggestions,
        timeSpent,
        status = 'draft'
      } = req.body;
      const submission = await CodeSubmission.findById(submissionId);
      if (!submission) {
        return next(new AppError('Submission not found', 404));
      }
      // Check if user is trying to review their own submission
  if (submission.author.toString() === req.user._id.toString()) {
    return next(new AppError("You cannot review your own submission", 403));
  }

  // Check if user has already reviewed this submission
  const existingReview = await Review.findOne({
    submission: submissionId,
    reviewer: req.user._id
  });

  if (existingReview) {
    return next(new AppError("You have already reviewed this submission", 400));
  }

  // Validate line comments are within code bounds
  if (lineComments && lineComments.length > 0) {
    const codeLines = submission.code.split('\n').length;
    const invalidLines = lineComments.filter(comment => 
      comment.lineNumber < 1 || comment.lineNumber > codeLines
    );
    
    if (invalidLines.length > 0) {
      return next(new AppError("Some line comments reference invalid line numbers", 400));
    }
  }

  // Create review
  const reviewData = {
    submission: submissionId,
    reviewer: req.user._id,
    overallFeedback,
    rating,
    lineComments: lineComments || [],
    categories,
    suggestions: suggestions || [],
    status,
    timeSpent: timeSpent || 0
  };

  const newReview = await Review.create(reviewData);

  // Populate reviewer information
  await newReview.populate('reviewer', 'username profile reputation');

  // Update submission status and reviewer status
  if (status === 'submitted') {
    // Update reviewer status in submission
    const reviewerIndex = submission.reviewers.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );
    
    if (reviewerIndex !== -1) {
      submission.reviewers[reviewerIndex].status = 'completed';
    }

    // Update submission analytics
    submission.analytics.completedReviews += 1;
    
    // Calculate average rating
    const allReviews = await Review.find({ 
      submission: submissionId, 
      status: 'submitted' 
    });
    
    if (allReviews.length > 0) {
      const avgRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;
      submission.analytics.averageRating = Math.round(avgRating * 10) / 10; // Round to 1 decimal
    }

    // Update submission status if all assigned reviewers completed
    const allCompleted = submission.reviewers.every(r => r.status === 'completed');
    if (allCompleted && submission.reviewers.length > 0) {
      submission.status = 'completed';
      submission.completedAt = new Date();
    }

    await submission.save();

    // Update reviewer reputation
    await updateUserReputation(req.user._id, 10, 'review_given');
    
    // Update submission author reputation
    await updateUserReputation(submission.author, 2, 'review_received');
  }

  res.status(201).json({
    status: "success",
    data: { review: newReview }
  });
});

// GET SINGLE REVIEW BY ID
export const getReviewById = catchAsync(async (req, res, next) => {
    const { reviewId } = req.params;
  
    const review = await Review.findById(reviewId)
      .populate('reviewer', 'username profile reputation createdAt')
      .populate('submission', 'title author visibility')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username profile'
        }
      });
  
    if (!review) {
      return next(new AppError("Review not found", 404));
    }
  
    // Check permissions for draft reviews
    if (review.status === 'draft') {
      if (!req.user || review.reviewer._id.toString() !== req.user._id.toString()) {
        return next(new AppError("You can only view your own draft reviews", 403));
      }
    }
  
    // Check submission visibility
    if (review.submission.visibility === 'private' && 
        (!req.user || review.submission.author.toString() !== req.user._id.toString())) {
      return next(new AppError("You don't have permission to view this review", 403));
    }
  
    res.status(200).json({
      status: "success",
      data: { review }
    });
  });

// GET REVIEWS FOR SUBMISSION
export const getReviewsBySubmission = catchAsync(async (req, res, next) => {
    const { submissionId } = req.params;
    const { includeInteractions = false } = req.query;
  
    // Check if submission exists
    const submission = await CodeSubmission.findById(submissionId);
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }
  
    // Check visibility permissions
    if (submission.visibility === 'private' && 
        (!req.user || submission.author.toString() !== req.user._id.toString())) {
      return next(new AppError("You don't have permission to view reviews for this submission", 403));
    }
  
    // Build query
    let query = Review.find({ submission: submissionId })
      .populate('reviewer', 'username profile reputation createdAt')
      .sort({ createdAt: -1 });
  
    // Include interactions (helpful votes, comments) if requested
    if (includeInteractions) {
      query = query.populate('interactions.helpful', 'username')
                   .populate({
                     path: 'comments',
                     populate: {
                       path: 'author',
                       select: 'username profile'
                     }
                   });
    }
  
    const reviews = await query;
  
    // Filter draft reviews (only reviewer can see their own drafts)
    const filteredReviews = reviews.filter(review => {
      if (review.status === 'draft') {
        return req.user && review.reviewer._id.toString() === req.user._id.toString();
      }
      return true;
    });
  
    res.status(200).json({
      status: "success",
      results: filteredReviews.length,
      data: { reviews: filteredReviews }
    });
  });  

// UPDATE REVIEW (Reviewer only)
export const updateReview = catchAsync(async (req, res, next) => {
    const { reviewId } = req.params;
    const {
      overallFeedback,
      rating,
      lineComments,
      categories,
      suggestions,
      timeSpent,
      status
    } = req.body;
  
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return next(new AppError("Review not found", 404));
    }
  
    // Check if user is the reviewer
    if (review.reviewer.toString() !== req.user._id.toString()) {
      return next(new AppError("You can only update your own reviews", 403));
    }
  
    // Don't allow updating submitted reviews (unless changing to revised)
    if (review.status === 'submitted' && status !== 'revised') {
      return next(new AppError("Cannot modify submitted reviews", 400));
    }
  
    // If changing from draft to submitted, validate required fields
    if (status === 'submitted' && review.status === 'draft') {
      const finalRating = rating !== undefined ? rating : review.rating;
      const finalFeedback = overallFeedback !== undefined ? overallFeedback : review.overallFeedback;
      const finalCategories = categories !== undefined ? categories : review.categories;
      
      if (!finalRating || !finalFeedback || !finalCategories) {
        return next(new AppError("Rating, overall feedback, and categories are required for submitted reviews", 400));
      }
    }
  
    // Get submission for line validation
    const submission = await CodeSubmission.findById(review.submission);
    
    // Validate line comments if provided
    if (lineComments && lineComments.length > 0) {
      const codeLines = submission.code.split('\n').length;
      const invalidLines = lineComments.filter(comment => 
        comment.lineNumber < 1 || comment.lineNumber > codeLines
      );
      
      if (invalidLines.length > 0) {
        return next(new AppError("Some line comments reference invalid line numbers", 400));
      }
    }
  
    // Update allowed fields
    const allowedFields = ['overallFeedback', 'rating', 'lineComments', 'categories', 'suggestions', 'timeSpent', 'status'];
    const updateObj = {};
  
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateObj[field] = req.body[field];
      }
    });
  
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      updateObj,
      { new: true, runValidators: true }
    ).populate('reviewer', 'username profile reputation');
  
    // Update submission analytics if review was submitted
    if (status === 'submitted' && review.status === 'draft') {
      submission.analytics.completedReviews += 1;
      
      // Recalculate average rating
      const allReviews = await Review.find({ 
        submission: submission._id, 
        status: 'submitted' 
      });
      
      if (allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        submission.analytics.averageRating = Math.round(avgRating * 10) / 10;
      }
  
      // Update reviewer status in submission
      const reviewerIndex = submission.reviewers.findIndex(
        r => r.user.toString() === req.user._id.toString()
      );
      
      if (reviewerIndex !== -1) {
        submission.reviewers[reviewerIndex].status = 'completed';
      }
  
      await submission.save();
  
      // Update reputation
      await updateUserReputation(req.user._id, 10, 'review_given');
      await updateUserReputation(submission.author, 2, 'review_received');
    }
  
    res.status(200).json({
      status: "success",
      data: { review: updatedReview }
    });
  });

// DELETE REVIEW
export const deleteReview = catchAsync(async (req, res, next) => {
    const { reviewId } = req.params;
  
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return next(new AppError("Review not found", 404));
    }
  
    // Check permissions (reviewer or admin)
    if (review.reviewer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new AppError("You can only delete your own reviews", 403));
    }
  
    // Don't allow deleting submitted reviews with interactions
    if (review.status === 'submitted' && 
        (review.interactions.helpful.length > 0 || review.interactions.replies.length > 0)) {
      return next(new AppError("Cannot delete reviews with interactions", 400));
    }
  
    await Review.findByIdAndDelete(reviewId);
  
    // Update submission analytics if it was a submitted review
    if (review.status === 'submitted') {
      const submission = await CodeSubmission.findById(review.submission);
      if (submission) {
        submission.analytics.completedReviews = Math.max(0, submission.analytics.completedReviews - 1);
        
        // Recalculate average rating
        const remainingReviews = await Review.find({ 
          submission: submission._id, 
          status: 'submitted' 
        });
        
        if (remainingReviews.length > 0) {
          const avgRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length;
          submission.analytics.averageRating = Math.round(avgRating * 10) / 10;
        } else {
          submission.analytics.averageRating = undefined;
        }
  
        await submission.save();
      }
    }
  
    res.status(200).json({
      status: "success",
      message: "Review deleted successfully"
    });
  });

// ADD LINE COMMENT TO EXISTING REVIEW
export const addLineComment = catchAsync(async (req, res, next) => {
    const  reviewId = req.params.reviewId;
    const { lineNumber, comment, severity = 'info', suggestion } = req.body;
  
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return next(new AppError("Review not found", 404));
    }
  
    // Check if user is the reviewer
    if (review.reviewer.toString() !== req.user._id.toString()) {
      return next(new AppError("You can only add comments to your own reviews", 403));
    }
  
    // Get submission to validate line number
    const submission = await CodeSubmission.findById(review.submission);
    const codeLines = submission.code.split('\n').length;
    
    if (lineNumber < 1 || lineNumber > codeLines) {
      return next(new AppError("Invalid line number", 400));
    }
  
    // Add line comment
    review.lineComments.push({
      lineNumber,
      comment,
      severity,
      suggestion,
      createdAt: new Date()
    });
  
    await review.save();
  
    res.status(200).json({
      status: "success",
      data: { review }
    });
  });

 
    
  // CHECK REVIEWER AVAILABILITY
  export const checkReviewerAvailability = catchAsync(async (req, res, next) => {
    const { reviewerId } = req.params;
  
    const reviewer = await User.findById(reviewerId)
      .select('username profile reputation preferences isActive');
  
    if (!reviewer || !reviewer.isActive) {
      return next(new AppError("Reviewer not found", 404));
    }
  
    // Check availability settings
    const isAvailable = reviewer.preferences?.availableForReview !== false;
  
    // Get current workload
    const activeReviews = await Review.countDocuments({
      reviewer: reviewerId,
      status: { $in: ['draft', 'submitted'] }
    });
  
    // Get pending assignments
    const pendingAssignments = await CodeSubmission.countDocuments({
      'reviewers.user': reviewerId,
      'reviewers.status': 'assigned'
    });
  
    const availability = {
      isAvailable,
      reputation: reviewer.reputation,
      skills: reviewer.skills || [],
      workload: {
        activeReviews,
        pendingAssignments,
        totalActive: activeReviews + pendingAssignments
      },
      matchScore: 0 // This will be calculated based on submission context
    };
  
    res.status(200).json({
      status: "success",
      data: { 
        reviewer: {
          id: reviewer._id,
          username: reviewer.username,
          profile: reviewer.profile
        },
        availability
      }
    });
  });

// MARK REVIEW AS HELPFUL
export const markHelpful = catchAsync(async (req, res, next) => {
    const { reviewId } = req.params;
  
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return next(new AppError("Review not found", 404));
    }
  
    // Can't mark own review as helpful
    if (review.reviewer.toString() === req.user._id.toString()) {
      return next(new AppError("You cannot mark your own review as helpful", 400));
    }
  
    // Check if already marked as helpful
    const alreadyHelpful = review.interactions.helpful.includes(req.user._id);
    
    if (alreadyHelpful) {
      // Remove helpful vote
      review.interactions.helpful = review.interactions.helpful.filter(
        userId => userId.toString() !== req.user._id.toString()
      );
    } else {
      // Add helpful vote
      review.interactions.helpful.push(req.user._id);
      
      // Give reputation points to the reviewer
      await updateUserReputation(review.reviewer, 1, 'helpful_vote');
    }
  
    await review.save();
  
    res.status(200).json({
      status: "success",
      message: alreadyHelpful ? "Helpful vote removed" : "Review marked as helpful",
      data: { 
        helpful: !alreadyHelpful,
        helpfulCount: review.interactions.helpful.length
      }
    });
  });  

// GET REVIEWS BY REVIEWER (User's own reviews)
export const getReviewsByReviewer = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 10, status } = req.query;
    const reviewerId = req.params.reviewerId || req.user._id;
  
    // Only users can see their own reviews, or admins can see any
    if (reviewerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new AppError("You can only view your own reviews", 403));
    }
  
    // Build filter
    const filter = { reviewer: reviewerId };
    if (status) filter.status = status;
  
    const skip = (page - 1) * limit;
  
    const reviews = await Review.find(filter)
      .populate('submission', 'title author language createdAt')
      .populate('submission.author', 'username profile')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
  
    const totalReviews = await Review.countDocuments(filter);
    const totalPages = Math.ceil(totalReviews / limit);
  
    res.status(200).json({
      status: "success",
      results: reviews.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResults: totalReviews,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      data: { reviews }
    });
  }); 

// GET REVIEW STATISTICS
export const getReviewStats = catchAsync(async (req, res, next) => {
  const { period = '30d', reviewerId } = req.query;
  
  // Date filter
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
    case 'all':
      dateFilter = {};
      break;
  }

  // Build match query
  const matchQuery = {
    status: 'submitted',
    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
  };
  
  if (reviewerId) {
    matchQuery.reviewer =  new mongoose.Types.ObjectId(reviewerId);
  }

  const stats = await Review.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        averageTimeSpent: { $avg: '$timeSpent' },
        totalHelpfulVotes: { $sum: { $size: '$interactions.helpful' } },
        ratingDistribution: { $push: '$rating' },
        categoryAverages: {
          $push: '$categories'
        },
        totalLineComments: { $sum: { $size: '$lineComments' } },
        totalSuggestions: { $sum: { $size: '$suggestions' } }
      }
    }
  ]);

  // Calculate rating distribution
  let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (stats[0] && stats[0].ratingDistribution) {
    stats[0].ratingDistribution.forEach(rating => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });
  }

  // Calculate category averages
  let categoryAverages = {
    codeQuality: 0,
    performance: 0,
    security: 0,
    maintainability: 0,
    bestPractices: 0
  };

  if (stats[0] && stats[0].categoryAverages.length > 0) {
    const categories = stats[0].categoryAverages;
    const categoryKeys = Object.keys(categoryAverages);
    
    categoryKeys.forEach(key => {
      const sum = categories.reduce((acc, cat) => acc + (cat[key] || 0), 0);
      categoryAverages[key] = categories.length > 0 ? sum / categories.length : 0;
    });
  }

  const result = {
    period,
    overview: stats[0] ? {
      totalReviews: stats[0].totalReviews,
      averageRating: Math.round((stats[0].averageRating || 0) * 10) / 10,
      averageTimeSpent: Math.round((stats[0].averageTimeSpent || 0) * 10) / 10,
      totalHelpfulVotes: stats[0].totalHelpfulVotes,
      totalLineComments: stats[0].totalLineComments,
      totalSuggestions: stats[0].totalSuggestions
    } : {
      totalReviews: 0,
      averageRating: 0,
      averageTimeSpent: 0,
      totalHelpfulVotes: 0,
      totalLineComments: 0,
      totalSuggestions: 0
    },
    ratingDistribution,
    categoryAverages
  };

  res.status(200).json({
    status: "success",
    data: { stats: result }
  });
});   

// GET SUGGESTED REVIEWERS FOR SUBMISSION
export const getSuggestedReviewersForSubmission = catchAsync(async (req, res, next) => {
    const { submissionId } = req.params;
    const { limit = 5 } = req.query;
    const limitNum = parseInt(limit, 10) || 5; // Default to 5 if invalid
  
    const submission = await CodeSubmission.findById(submissionId);
    
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }
  
    // Check if user is the author
    if (submission.author.toString() !== req.user._id.toString()) {
      return next(new AppError("Only the author can view suggested reviewers", 403));
    }
  
    const suggestedReviewers = await getSuggestedReviewers(submission, limitNum);
  
    res.status(200).json({
      status: "success",
      results: suggestedReviewers.length,
      data: { reviewers: suggestedReviewers }
    });
  });
  
  // ================================
  // HELPER FUNCTION: GET SUGGESTED REVIEWERS
  // ================================
  const getSuggestedReviewers = async (submission, limit = 5) => {
    const pipeline = [
      {
        $match: {
          _id: { $ne: submission.author }, // Not the author
          isActive: true,
          'preferences.availableForReview': { $ne: false }
        }
      },
      {
        $addFields: {
          skillMatch: {
            $size: {
              $setIntersection: ['$skills', submission.tags]
            }
          },
          languageMatch: {
            $cond: [
              { $in: [submission.language, '$preferences.languages'] },
              1,
              0
            ]
          }
        }
      },
      {
        $addFields: {
          matchScore: {
            $add: [
              { $multiply: ['$skillMatch', 3] }, // Skill match worth 3 points each
              { $multiply: ['$languageMatch', 5] }, // Language match worth 5 points
              { $divide: ['$reputation.points', 100] }, // Reputation bonus
              { $multiply: ['$reputation.reviewsGiven', 0.1] } // Experience bonus
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'reviews',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$reviewer', '$$userId'] },
                    { $in: ['$status', ['draft', 'assigned']] }
                  ]
                }
              }
            }
          ],
          as: 'activeReviews'
        }
      },
      {
        $addFields: {
          workload: { $size: '$activeReviews' }
        }
      },
      {
        $match: {
          workload: { $lt: 5 } // Don't suggest reviewers with 5+ active reviews
        }
      },
      {
        $sort: { matchScore: -1, 'reputation.points': -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          username: 1,
          profile: 1,
          reputation: 1,
          skills: 1,
          matchScore: 1,
          skillMatch: 1,
          languageMatch: 1,
          workload: 1,
          'preferences.languages': 1
        }
      }
    ];
  
    return await User.aggregate(pipeline);
  };
  