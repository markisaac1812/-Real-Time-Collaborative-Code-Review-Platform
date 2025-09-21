import User from "../models/userModel.js";
import CodeSubmission from "../models/CodeSubmission.js";
import Review from "../models/Review.js";
import Comment from "../models/comment.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { createNotification } from "../utils/notificationHelper.js";
import mongoose from "mongoose";

// FOLLOW/UNFOLLOW USER
export const toggleFollow = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  // Can't follow yourself
  if (userId === req.user._id.toString()) {
    return next(new AppError("You cannot follow yourself", 400));
  }

  // Check if user exists
  const userToFollow = await User.findById(userId);
  if (!userToFollow || !userToFollow.isActive) {
    return next(new AppError("User not found", 404));
  }

  const currentUser = await User.findById(req.user._id);
  
  // Check if already following
  const followingIndex = currentUser.following?.indexOf(userId) ?? -1;
  const isFollowing = followingIndex > -1;

  if (isFollowing) {
    // Unfollow
    currentUser.following.splice(followingIndex, 1);
    userToFollow.followers = userToFollow.followers.filter(
      id => id.toString() !== req.user._id.toString()
    );
  } else {
    // Follow
    if (!currentUser.following) currentUser.following = [];
    if (!userToFollow.followers) userToFollow.followers = [];
    
    currentUser.following.push(userId);
    userToFollow.followers.push(req.user._id);

    // Create notification
    await createNotification({
      recipient: userId,
      sender: req.user._id,
      type: 'follow',
      data: {
        message: `${req.user.username} started following you`
      }
    });
  }

  await Promise.all([currentUser.save(), userToFollow.save()]);

  res.status(200).json({
    status: "success",
    message: isFollowing ? "User unfollowed" : "User followed",
    data: {
      isFollowing: !isFollowing,
      followersCount: userToFollow.followers.length,
      followingCount: currentUser.following.length
    }
  });
});

// GET USER'S FOLLOWERS
export const getFollowers = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const skip = (page - 1) * limit;
  
  const followers = await User.find({
    _id: { $in: user.followers || [] },
    isActive: true
  })
    .select('username profile reputation createdAt')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const totalFollowers = user.followers?.length || 0;
  const totalPages = Math.ceil(totalFollowers / limit);

  res.status(200).json({
    status: "success",
    results: followers.length,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalResults: totalFollowers
    },
    data: { followers }
  });
});

// GET USER'S FOLLOWING
export const getFollowing = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
  
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }
  
    const skip = (page - 1) * limit;
    
    const following = await User.find({
      _id: { $in: user.following || [] },
      isActive: true
    })
      .select('username profile reputation createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
  
    const totalFollowing = user.following?.length || 0;
    const totalPages = Math.ceil(totalFollowing / limit);
  
    res.status(200).json({
      status: "success",
      results: following.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResults: totalFollowing
      },
      data: { following }
    });
  });

  
  // GET USER ACTIVITY FEED
  export const getActivityFeed = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20, type = 'all' } = req.query;
    
    const user = await User.findById(req.user._id);
    const followingList = user.following || [];
    
    // Add current user to get own activities too
    const userIds = [...followingList, req.user._id];
    
    const skip = (page - 1) * limit;
    const activities = [];
  
    // Get recent submissions
    if (type === 'all' || type === 'submissions') {
      const submissions = await CodeSubmission.find({
        author: { $in: userIds },
        visibility: 'public',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      })
        .populate('author', 'username profile')
        .sort({ createdAt: -1 })
        .limit(10);
  
      submissions.forEach(submission => {
        activities.push({
          type: 'submission',
          timestamp: submission.createdAt,
          user: submission.author,
          data: {
            submissionId: submission._id,
            title: submission.title,
            language: submission.language,
            tags: submission.tags
          }
        });
      });
    }
  
    // Get recent reviews
    if (type === 'all' || type === 'reviews') {
      const reviews = await Review.find({
        reviewer: { $in: userIds },
        status: 'submitted',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
        .populate('reviewer', 'username profile')
        .populate('submission', 'title author')
        .sort({ createdAt: -1 })
        .limit(10);
  
      reviews.forEach(review => {
        activities.push({
          type: 'review',
          timestamp: review.createdAt,
          user: review.reviewer,
          data: {
            reviewId: review._id,
            submissionId: review.submission._id,
            submissionTitle: review.submission.title,
            rating: review.rating
          }
        });
      });
    }
  
    // Get recent comments
    if (type === 'all' || type === 'comments') {
      const comments = await Comment.find({
        author: { $in: userIds },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
        .populate('author', 'username profile')
        .populate({
          path: 'review',
          populate: {
            path: 'submission',
            select: 'title'
          }
        })
        .sort({ createdAt: -1 })
        .limit(10);
  
      comments.forEach(comment => {
        activities.push({
          type: 'comment',
          timestamp: comment.createdAt,
          user: comment.author,
          data: {
            commentId: comment._id,
            reviewId: comment.review._id,
            submissionTitle: comment.review.submission.title,
            content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : '')
          }
        });
      });
    }
  
    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
    // Paginate
    const paginatedActivities = activities.slice(skip, skip + parseInt(limit));
  
    res.status(200).json({
      status: "success",
      results: paginatedActivities.length,
      pagination: {
        currentPage: parseInt(page),
        hasNext: skip + parseInt(limit) < activities.length,
        hasPrev: page > 1
      },
      data: { activities: paginatedActivities }
    });
  });  

  // UPDATE REPUTATION SYSTEM (Enhanced)
  export const updateReputationSystem = catchAsync(async (req, res, next) => {
    const userId = req.params.userId || req.user._id;
    
    if (userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new AppError("You can only update your own reputation", 403));
    }
  
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }
  
    // Recalculate reputation based on activities
    const [submissionStats, reviewStats, commentStats] = await Promise.all([
      CodeSubmission.aggregate([
        { $match: { author:  new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            totalViews: { $sum: '$analytics.views' },
            averageRating: { $avg: '$analytics.averageRating' }
          }
        }
      ]),
      Review.aggregate([
        { $match: { reviewer: new mongoose.Types.ObjectId(userId), status: 'submitted' } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            totalHelpfulVotes: { $sum: { $size: '$interactions.helpful' } },
            averageRating: { $avg: '$rating' }
          }
        }
      ]),
      Comment.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalComments: { $sum: 1 },
            totalLikes: { $sum: { $size: '$reactions.likes' } }
          }
        }
      ])
    ]);
  
    const submissionData = submissionStats[0] || {};
    const reviewData = reviewStats[0] || {};
    const commentData = commentStats[0] || {};
  
    // Calculate new reputation
    let newReputation = 0;
    
    // Base points
    newReputation += (submissionData.totalSubmissions || 0) * 5; // 5 points per submission
    newReputation += (reviewData.totalReviews || 0) * 10; // 10 points per review
    newReputation += (commentData.totalComments || 0) * 1; // 1 point per comment
    
    // Quality bonuses
    newReputation += (reviewData.totalHelpfulVotes || 0) * 2; // 2 points per helpful vote
    newReputation += (commentData.totalLikes || 0) * 1; // 1 point per comment like
    newReputation += Math.floor((submissionData.totalViews || 0) / 10); // 1 point per 10 views
  
    // Update user reputation
    user.reputation.points = Math.max(0, newReputation);
    user.reputation.reviewsGiven = reviewData.totalReviews || 0;
    user.reputation.helpfulVotes = reviewData.totalHelpfulVotes || 0;
  
    // Update level
    if (user.reputation.points >= 1000) user.reputation.level = "Master";
    else if (user.reputation.points >= 500) user.reputation.level = "Expert";
    else if (user.reputation.points >= 100) user.reputation.level = "Intermediate";
    else user.reputation.level = "Beginner";
  
    await user.save();
  
    res.status(200).json({
      status: "success",
      message: "Reputation updated successfully",
      data: {
        reputation: user.reputation,
        breakdown: {
          submissions: submissionData,
          reviews: reviewData,
          comments: commentData
        }
      }
    });
  }); 
  
// GET SOCIAL STATS
export const getSocialStats = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
  
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }
  
    const stats = {
      followers: user.followers?.length || 0,
      following: user.following?.length || 0,
      reputation: user.reputation,
      totalSubmissions: await CodeSubmission.countDocuments({ author: userId }),
      totalReviews: await Review.countDocuments({ reviewer: userId, status: 'submitted' }),
      totalComments: await Comment.countDocuments({ author: userId }),
      joinedDate: user.createdAt,
      lastActive: user.lastLogin
    };
  
    res.status(200).json({
      status: "success",
      data: { stats }
    });
  });  