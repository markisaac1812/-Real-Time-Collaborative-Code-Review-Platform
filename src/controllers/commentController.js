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

// HELPER FUNCTION: GET NESTED REPLIES
const getNestedReplies = async (parentCommentId, maxDepth = 5, currentDepth = 0) => {
    if (currentDepth >= maxDepth) return [];
  
    const replies = await Comment.find({ parentComment: parentCommentId })
      .populate('author', 'username profile reputation')
      .sort({ createdAt: 1 });
  
    const nestedReplies = await Promise.all(
      replies.map(async (reply) => {
        const replyObj = reply.toObject();
        replyObj.replies = await getNestedReplies(reply._id, maxDepth, currentDepth + 1);
        replyObj.replyCount = await Comment.countDocuments({ parentComment: reply._id });
        return replyObj;
      })
    );
  
    return nestedReplies;
  };  

// GET COMMENTS FOR REVIEW (WITH NESTING)
export const getComments = catchAsync(async (req, res, next) => {
    const { reviewId } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'asc' } = req.query;
  
    // Verify review exists
    const review = await Review.findById(reviewId);
    if (!review) {
      return next(new AppError("Review not found", 404));
    }
  
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
    // Get top-level comments (no parent)
    const skip = (page - 1) * limit;
    const topLevelComments = await Comment.find({ 
      review: reviewId, 
      parentComment: null 
    })
      .populate('author', 'username profile reputation')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);
  
    // Get all replies for these comments (recursive)
    const commentsWithReplies = await Promise.all(
      topLevelComments.map(async (comment) => {
        const commentObj = comment.toObject();
        commentObj.replies = await getNestedReplies(comment._id);
        commentObj.replyCount = await Comment.countDocuments({ parentComment: comment._id });
        return commentObj;
      })
    );
  
    const totalComments = await Comment.countDocuments({ 
      review: reviewId, 
      parentComment: null 
    });
    
    const totalPages = Math.ceil(totalComments / limit);
  
    res.status(200).json({
      status: "success",
      results: commentsWithReplies.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResults: totalComments,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      data: { comments: commentsWithReplies }
    });
  });
  