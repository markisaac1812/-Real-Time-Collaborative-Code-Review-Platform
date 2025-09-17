import User from "../models/userModel.js";
import catchAsync from "./../utils/catchAsync.js";
import appError from "./../utils/appError.js";

export const getProfileForSignedUser = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not found or not logged in", 404));
  }
  const publicProfile = {
    id: req.user._id,
    username: req.user.username,
    profile: req.user.profile,
    skills: req.user.skills,
    reputation: req.user.reputation,
    createdAt: req.user.createdAt,
    role: req.user.role,
  };

  res.status(200).json({
    status: "success",
    profile: publicProfile,
  });
});

export const updateProfileForSignedUser = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not found or not logged in", 404));
  }
  const allowedFields = ["profile", "skills", "preferences"];
  const updateObj = {};

  // Filter only allowed fields
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updateObj[key] = req.body[key];
    }
  });

  if (updateObj.skills && updateObj.skills.length > 20) {
    return next(new AppError("Cannot have more than 20 skills", 400));
  }
  const updatedUser = await User.findByIdAndUpdate(req.user.id, updateObj, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: updatedUser,
  });
});

export const getProfileWithoutLoggingIn = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);
  if (!user || !user.isActive) {
    return next(new AppError("User not found", 404));
  }

  // Return public profile (no sensitive data)
  const publicProfile = {
    id: user._id,
    username: user.username,
    profile: user.profile,
    skills: user.skills,
    reputation: user.reputation,
    createdAt: user.createdAt,
    role: user.role,
  };

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

// GET USER STATISTICS
export const getUserStats = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not found", 404));
  }

  const stats = {
    reputation: req.user.reputation,
    joinDate: req.user.createdAt,
    lastActive: req.user.lastLogin,
    skillCount: req.user.skills?.length || 0,
    accountAge: Math.floor(
      (Date.now() - req.user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    ), // days
  };

  res.status(200).json({
    status: "success",
    data: { stats },
  });
});

export const searchUsers = catchAsync(async (req, res, next) => {
  const { query, skills, limit = 10, page = 1 } = req.query;

  const searchQuery = { isActive: true };

  // Search by username or profile name
  if (query) {
    searchQuery.$or = [
      { username: { $regex: query, $options: "i" } },
      { "profile.firstName": { $regex: query, $options: "i" } },
      { "profile.lastName": { $regex: query, $options: "i" } },
    ];
  }

  // Filter by skills
  if (skills) {
    const skillsArray = skills.split(",");
    searchQuery.skills = { $in: skillsArray };
  }

  const users = await User.find(searchQuery)
    .select("username profile skills reputation createdAt")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ "reputation.points": -1 });

  const totalUsers = await User.countDocuments(searchQuery);

  res.status(200).json({
    status: "success",
    results: users.length,
    totalPages: Math.ceil(totalUsers / limit),
    currentPage: page,
    data: { users },
  });
});

export const getLeaderboard = catchAsync(async (req, res, next) => {
  const { limit = 10, category = "points" } = req.query;

  let sortField;
  switch (category) {
    case "reviews":
      sortField = "reputation.reviewsGiven";
      break;
    case "helpful":
      sortField = "reputation.helpfulVotes";
      break;
    default:
      sortField = "reputation.points";
  }

  const users = await User.find({ isActive: true })
    .select("username profile reputation createdAt")
    .sort({ [sortField]: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    status: "success",
    category,
    data: { users },
  });
});
