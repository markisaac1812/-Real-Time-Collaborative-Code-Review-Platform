import Comment from "../models/comment.js";
import Review from "../models/Review.js";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import {createNotification} from "../utils/notificationHelper.js";
import { updateUserReputation } from "../utils/databaseHelpers.js";

export const createComment = catchAsync(async (req, res, next) => {
    const { reviewId } = req.params;
    const { content, parentCommentId } = req.body;
  
    // Verify review exists
    const review = await Review.findById(reviewId)
      .populate('reviewer', 'username')
      .populate('submission', 'author title');
      
    if (!review) {
      return next(new AppError("Review not found", 404));
    }
  
    // If replying to a comment, verify parent comment exists and belongs to same review
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return next(new AppError("Parent comment not found", 404));
      }
      if (parentComment.review.toString() !== reviewId) {
        return next(new AppError("Parent comment belongs to different review", 400));
      }
    }
  
    // Create comment
    const newComment = await Comment.create({
      review: reviewId,
      author: req.user._id,
      content,
      parentComment: parentCommentId || null
    });
  
    // Populate author information
    await newComment.populate('author', 'username profile reputation');
  
    // Update review's replies array
    review.interactions.replies.push(newComment._id);
    await review.save();
  
    // Create notifications
    const notifications = [];
    
    // Notify review author (if not commenting on own review)
    if (review.reviewer._id.toString() !== req.user._id.toString()) {
      notifications.push({
        recipient: review.reviewer._id,
        sender: req.user._id,
        type: 'comment_added',
        data: {
          reviewId: review._id,
          commentId: newComment._id,
          submissionId: review.submission._id,
          message: `${req.user.username} commented on your review of "${review.submission.title}"`
        }
      });
    }
  
    // Notify submission author (if different from reviewer and commenter)
    if (review.submission.author.toString() !== req.user._id.toString() && 
        review.submission.author.toString() !== review.reviewer._id.toString()) {
      notifications.push({
        recipient: review.submission.author,
        sender: req.user._id,
        type: 'comment_added',
        data: {
          reviewId: review._id,
          commentId: newComment._id,
          submissionId: review.submission._id,
          message: `${req.user.username} commented on a review of your submission "${review.submission.title}"`
        }
      });
    }
  
    // Notify parent comment author (if replying)
    if (parentComment && parentComment.author.toString() !== req.user._id.toString()) {
      notifications.push({
        recipient: parentComment.author,
        sender: req.user._id,
        type: 'comment_added',
        data: {
          reviewId: review._id,
          commentId: newComment._id,
          parentCommentId: parentComment._id,
          message: `${req.user.username} replied to your comment`
        }
      });
    }
  
    // Send notifications
    await Promise.all(notifications.map(notif => createNotification(notif)));
  
    // Give small reputation boost for engagement
    await updateUserReputation(req.user._id, 1, 'comment_created');
  
    res.status(201).json({
      status: "success",
      data: { comment: newComment }
    });
  });