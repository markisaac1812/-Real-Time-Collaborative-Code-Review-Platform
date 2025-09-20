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

