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

// MANUAL REVIEWER ASSIGNMENT (Enhanced from Day 3)
export const manualAssignReviewer = catchAsync(async (req, res, next) => {
    const { submissionId } = req.params;
    const { reviewerId, message } = req.body;
  
    const submission = await CodeSubmission.findById(submissionId);
    
    if (!submission) {
      return next(new AppError("Submission not found", 404));
    }
  
    // Check if user is the author or has permission
    if (submission.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new AppError("Only the author can assign reviewers", 403));
    }
  
    // Check reviewer availability
    const reviewer = await User.findById(reviewerId);
    if (!reviewer || !reviewer.isActive) {
      return next(new AppError("Reviewer not found or inactive", 404));
    }
  
    if (!reviewer.preferences?.availableForReview) {
      return next(new AppError("Reviewer is not available for reviews", 400));
    }
  
    // Check if reviewer is already assigned
    const isAlreadyAssigned = submission.reviewers.some(
      r => r.user.toString() === reviewerId
    );
  
    if (isAlreadyAssigned) {
      return next(new AppError("Reviewer is already assigned to this submission", 400));
    }
  
    // Add reviewer
    submission.reviewers.push({
      user: reviewerId,
      assignedAt: new Date(),
      status: 'assigned'
    });
  
    // Update submission status if it was open
    if (submission.status === 'open') {
      submission.status = 'in-review';
    }
  
    submission.analytics.reviewRequests += 1;
    await submission.save();
  
    // TODO: Create notification for reviewer (Day 5)
  
    await submission.populate('reviewers.user', 'username profile reputation');
  
    res.status(200).json({
      status: "success",
      message: "Reviewer assigned successfully",
      data: { submission }
    });
  });  
    