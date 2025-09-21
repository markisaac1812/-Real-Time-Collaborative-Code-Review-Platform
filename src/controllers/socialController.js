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