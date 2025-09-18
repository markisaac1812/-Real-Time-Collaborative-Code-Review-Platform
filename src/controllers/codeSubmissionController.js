import mongoose from "mongoose";
import CodeSubmission from "../models/CodeSubmission.js";
import Review from "../models/Review.js";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { updateUserReputation } from "./../utils/databaseHelpers.js";

export const createSubmission = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    code,
    language,
    tags,
    category,
    priority,
    visibility,
    fileName,
  } = req.body;
  if (tags && tags.length > 10) {
    return next(new AppError("Cannot have more than 10 tags", 400));
  }
  const submissionData = {
    title,
    description,
    code,
    language,
    author: req.user._id,
    tags: tags || [],
    category: category,
    priority: priority,
    visibility: visibility,
  };
  if (fileName) {
    submissionData.metadata = { fileName };
  }
  const newSubmission = await CodeSubmission.create(submissionData);

  // Populate author information
  await newSubmission.populate("author", "username profile reputation");

  // Update user reputation for creating a submission
  await updateUserReputation(req.user._id, 5, "submission_created");
  res.status(201).json({
    status: "success",
    data: newSubmission,
  });
});

export const getSubmissions = catchAsync(async (req, res, next) => {
  // Extract query parameters
  const {
    page = 1,
    limit = 10,
    language,
    category,
    status,
    priority,
    author,
    tags,
    visibility = "public",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  // Build filter object
  const filter = {};

  // Public visibility by default, unless user is viewing their own submissions
  if (req.user && author === req.user._id.toString()) {
    // User viewing their own submissions - can see all visibilities
    filter.author = req.user._id;
  } else {
    // Public view - only show public submissions
    filter.visibility = "public";
    if (author) filter.author = author;
  }

  // Add other filters
  if (language) filter.language = language;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  // Handle tags filter (array of tags)
  if (tags) {
    const tagsArray = tags.split(",").map((tag) => tag.trim());
    filter.tags = { $in: tagsArray };
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute query with pagination
  const submissions = await CodeSubmission.find(filter)
    .populate("author", "username profile reputation")
    .populate("reviewers.user", "username profile reputation")
    .sort(sort)
    .limit(parseInt(limit))
    .skip(skip);

  // Get total count for pagination
  const totalSubmissions = await CodeSubmission.countDocuments(filter);
  const totalPages = Math.ceil(totalSubmissions / limit);

  res.status(200).json({
    status: "success",
    results: submissions.length,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalResults: totalSubmissions,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    data: { submissions },
  });
});

export const getSubmissionById = catchAsync(async (req, res, next) => {
  const id = req.params.id;

  const submission = await CodeSubmission.findById(id)
    .populate("author", "username profile reputation createdAt")
    .populate("reviewers.user", "username profile reputation")
    .populate({
      path: "reviews",
      populate: {
        path: "reviewer",
        select: "username profile reputation",
      },
    });

  if (!submission) {
    return next(new AppError("Submission not found", 404));
  }

  // Check visibility permissions
  if (
    submission.visibility === "private" &&
    (!req.user || submission.author._id.toString() !== req.user._id.toString())
  ) {
    return next(
      new AppError("You don't have permission to view this submission", 403)
    );
  }

  // Increment view count (only if not the author viewing their own submission)
  if (
    !req.user ||
    submission.author._id.toString() !== req.user._id.toString()
  ) {
    await submission.incrementViews();
  }

  res.status(200).json({
    status: "success",
    data: { submission },
  });
});

// UPDATE SUBMISSION (Author only)
export const updateSubmission = catchAsync(async (req, res, next) => {
  const id = req.params.id;

  // Find submission
  const submission = await CodeSubmission.findById(id);

  if (!submission) {
    return next(new AppError("Submission not found", 404));
  }

  // Check if user is the author
  if (submission.author.toString() !== req.user._id.toString()) {
    return next(new AppError("You can only update your own submissions", 403));
  }

  // Don't allow updating if submission is completed
  if (submission.status === "completed") {
    return next(new AppError("Cannot update completed submissions", 400));
  }

  // Fields that can be updated
  const allowedFields = [
    "title",
    "description",
    "code",
    "tags",
    "category",
    "priority",
    "visibility",
  ];
  const updateObj = {};

  // Filter only allowed fields
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updateObj[key] = req.body[key];
    }
  });

  // Validate tags if being updated
  if (updateObj.tags && updateObj.tags.length > 10) {
    return next(new AppError("Cannot have more than 10 tags", 400));
  }

  // Update submission
  const updatedSubmission = await CodeSubmission.findByIdAndUpdate(
    id,
    updateObj,
    { new: true, runValidators: true }
  ).populate("author", "username profile reputation");

  res.status(200).json({
    status: "success",
    data: { submission: updatedSubmission },
  });
});

// DELETE SUBMISSION (Soft delete - change status to closed)
export const deleteSubmission = catchAsync(async (req, res, next) => {
  const id = req.params.id;

  const submission = await CodeSubmission.findById(id);

  if (!submission) {
    return next(new AppError("Submission not found", 404));
  }

  // Check permissions (author or admin)
  if (
    submission.author.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(new AppError("You can only delete your own submissions", 403));
  }

  // Soft delete by changing status
  submission.status = "closed";
  await submission.save();

  res.status(200).json({
    status: "success",
    message: "Submission deleted successfully",
  });
});

// GET SUBMISSIONS BY SPECIFIC USER
export const getSubmissionsByUser = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;
  const { page = 1, limit = 10, includePrivate = false } = req.query;

  // Check if user exists
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    return next(new AppError("User not found", 404));
  }

  // Build filter
  const filter = { author: userId };

  // Only include private submissions if viewing own profile
  if (!includePrivate || !req.user || req.user._id.toString() !== userId) {
    filter.visibility = "public";
  }

  const skip = (page - 1) * limit;

  const submissions = await CodeSubmission.find(filter)
    .populate("author", "username profile reputation")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const totalSubmissions = await CodeSubmission.countDocuments(filter);
  const totalPages = Math.ceil(totalSubmissions / limit);

  res.status(200).json({
    status: "success",
    results: submissions.length,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalResults: totalSubmissions,
    },
    data: {
      user: {
        id: user._id,
        username: user.username,
        profile: user.profile,
        reputation: user.reputation,
      },
      submissions,
    },
  });
});

// SEARCH SUBMISSIONS WITH ADVANCED FILTERING
export const searchSubmissions = catchAsync(async (req, res, next) => {
  const {
    q, // search query
    language,
    tags,
    author,
    category,
    status,
    priority,
    minRating,
    maxRating,
    dateFrom,
    dateTo,
    sortBy = "relevance",
    page = 1,
    limit = 10,
  } = req.validatedQuery || req.query;

  // Build search pipeline
  const pipeline = [];

  // Match stage - basic filters
  const matchStage = {
    visibility: "public", // Only show public submissions
    status: { $ne: "closed" }, // Don't show closed submissions
  };

  // Add filters
  if (language) matchStage.language = language;
  if (category) matchStage.category = category;
  if (status && status !== "all") matchStage.status = status;
  if (priority) matchStage.priority = priority;
  if (author) matchStage.author = new mongoose.Types.ObjectId(author);

  // Tags filter
  if (tags) {
    const tagsArray = tags.split(",").map((tag) => tag.trim());
    matchStage.tags = { $in: tagsArray };
  }

  // Date range filter
  if (dateFrom || dateTo) {
    matchStage.createdAt = {};
    if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
    if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
  }

  // Rating filter (based on average rating from reviews)
  if (minRating || maxRating) {
    matchStage["analytics.averageRating"] = {};
    if (minRating)
      matchStage["analytics.averageRating"].$gte = parseFloat(minRating);
    if (maxRating)
      matchStage["analytics.averageRating"].$lte = parseFloat(maxRating);
  }

  pipeline.push({ $match: matchStage });

  // Text search stage
  if (q) {
    pipeline.unshift({
      $match: {
        $or: [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { tags: { $regex: q, $options: "i" } },
          { code: { $regex: q, $options: "i" } },
        ],
      },
    });
  }

  // Add score for text search relevance
  if (q) {
    pipeline.push({
      $addFields: {
        searchScore: {
          $sum: [
            {
              $cond: [
                { $regexMatch: { input: "$title", regex: q, options: "i" } },
                10,
                0,
              ],
            },
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$description",
                    regex: q,
                    options: "i",
                  },
                },
                5,
                0,
              ],
            },
            {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$tags",
                          cond: {
                            $regexMatch: {
                              input: "$$this",
                              regex: q,
                              options: "i",
                            },
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
                3,
                0,
              ],
            },
            {
              $cond: [
                { $regexMatch: { input: "$code", regex: q, options: "i" } },
                1,
                0,
              ],
            },
          ],
        },
      },
    });
  }

  // Lookup author information
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "author",
      foreignField: "_id",
      as: "author",
      pipeline: [{ $project: { username: 1, profile: 1, reputation: 1 } }],
    },
  });

  pipeline.push({
    $unwind: "$author",
  });

  // Sort stage
  let sortStage = {};
  switch (sortBy) {
    case "relevance":
      sortStage = q
        ? { searchScore: -1, "analytics.views": -1 }
        : { "analytics.views": -1 };
      break;
    case "newest":
      sortStage = { createdAt: -1 };
      break;
    case "oldest":
      sortStage = { createdAt: 1 };
      break;
    case "mostViewed":
      sortStage = { "analytics.views": -1 };
      break;
    case "highestRated":
      sortStage = {
        "analytics.averageRating": -1,
        "analytics.completedReviews": -1,
      };
      break;
    default:
      sortStage = { createdAt: -1 };
  }

  pipeline.push({ $sort: sortStage });

  // Pagination
  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: parseInt(limit) });

  // Execute aggregation
  const submissions = await CodeSubmission.aggregate(pipeline);

  // Get total count for pagination
  const countPipeline = [...pipeline];
  countPipeline.pop(); // Remove limit
  countPipeline.pop(); // Remove skip
  countPipeline.push({ $count: "total" });

  const countResult = await CodeSubmission.aggregate(countPipeline);
  const totalResults = countResult[0]?.total || 0;
  const totalPages = Math.ceil(totalResults / limit);

  res.status(200).json({
    status: "success",
    results: submissions.length,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalResults,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    filters: {
      query: q,
      language,
      tags,
      category,
      status,
      sortBy,
    },
    data: { submissions },
  });
});

// ASSIGN REVIEWER TO SUBMISSION
export const assignReviewer = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const { reviewerId } = req.body;

  const submission = await CodeSubmission.findById(id);

  if (!submission) {
    return next(new AppError("Submission not found", 404));
  }

  // Check if user is the author or has permission
  if (
    submission.author.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(new AppError("Only the author can assign reviewers", 403));
  }

  // Check if reviewer exists and is available
  const reviewer = await User.findById(reviewerId);
  if (
    !reviewer ||
    !reviewer.isActive ||
    !reviewer.preferences.availableForReview
  ) {
    return next(new AppError("Reviewer not found or not available", 404));
  }

  // Check if reviewer is already assigned
  const isAlreadyAssigned = submission.reviewers.some(
    (r) => r.user.toString() === reviewerId
  );

  if (isAlreadyAssigned) {
    return next(
      new AppError("Reviewer is already assigned to this submission", 400)
    );
  }

  // Add reviewer
  submission.reviewers.push({
    user: reviewerId,
    assignedAt: new Date(),
    status: "assigned",
  });

  // Update submission status if it was open
  if (submission.status === "open") {
    submission.status = "in-review";
  }

  await submission.save();

  // Create notification for reviewer (you'll implement this in Day 5)
  // await createNotification({
  //   recipient: reviewerId,
  //   sender: req.user._id,
  //   type: 'review_request',
  //   data: {
  //     submissionId: submission._id,
  //     message: `${req.user.username} assigned you to review "${submission.title}"`
  //   }
  // });

  await submission.populate("reviewers.user", "username profile reputation");

  res.status(200).json({
    status: "success",
    message: "Reviewer assigned successfully",
    data: { submission },
  });
});

// GET SUBMISSION ANALYTICS
export const getSubmissionAnalytics = catchAsync(async (req, res, next) => {
  const { period = "30d" } = req.query;

  // Calculate date range
  let dateFilter = {};
  const now = new Date();

  switch (period) {
    case "7d":
      dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      break;
    case "30d":
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      break;
    case "90d":
      dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
      break;
    case "all":
      dateFilter = {};
      break;
    default:
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  }

  const analytics = await CodeSubmission.aggregate([
    {
      $match: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        visibility: "public",
      },
    },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        totalViews: { $sum: "$analytics.views" },
        averageViews: { $avg: "$analytics.views" },
        completedSubmissions: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        inReviewSubmissions: {
          $sum: { $cond: [{ $eq: ["$status", "in-review"] }, 1, 0] },
        },
        openSubmissions: {
          $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
        },
        languageDistribution: { $push: "$language" },
        categoryDistribution: { $push: "$category" },
        averageCodeLength: { $avg: "$metadata.characterCount" },
        averageLineCount: { $avg: "$metadata.lineCount" },
      },
    },
  ]);

  // Get top languages
  const languageStats = await CodeSubmission.aggregate([
    {
      $match: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        visibility: "public",
      },
    },
    {
      $group: {
        _id: "$language",
        count: { $sum: 1 },
        averageViews: { $avg: "$analytics.views" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Get top tags
  const tagStats = await CodeSubmission.aggregate([
    {
      $match: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        visibility: "public",
      },
    },
    { $unwind: "$tags" },
    {
      $group: {
        _id: "$tags",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Get most active authors
  const authorStats = await CodeSubmission.aggregate([
    {
      $match: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        visibility: "public",
      },
    },
    {
      $group: {
        _id: "$author",
        submissionCount: { $sum: 1 },
        totalViews: { $sum: "$analytics.views" },
      },
    },
    { $sort: { submissionCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: "$author" },
    {
      $project: {
        username: "$author.username",
        profile: "$author.profile",
        submissionCount: 1,
        totalViews: 1,
      },
    },
  ]);

  const result = {
    period,
    overview: analytics[0] || {
      totalSubmissions: 0,
      totalViews: 0,
      averageViews: 0,
      completedSubmissions: 0,
      inReviewSubmissions: 0,
      openSubmissions: 0,
    },
    languages: languageStats,
    tags: tagStats,
    topAuthors: authorStats,
  };

  res.status(200).json({
    status: "success",
    data: { analytics: result },
  });
});

// TOGGLE SUBMISSION VISIBILITY
export const toggleVisibility = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const { visibility } = req.body;

  if (!["public", "private", "team"].includes(visibility)) {
    return next(new AppError("Invalid visibility option", 400));
  }

  const submission = await CodeSubmission.findById(id);

  if (!submission) {
    return next(new AppError("Submission not found", 404));
  }

  // Check if user is the author
  if (submission.author.toString() !== req.user._id.toString()) {
    return next(new AppError("Only the author can change visibility", 403));
  }

  submission.visibility = visibility;
  await submission.save();

  res.status(200).json({
    status: "success",
    message: `Submission visibility changed to ${visibility}`,
    data: { submission },
  });
});

// GET USER'S SUBMISSION STATISTICS
export const getUserSubmissionStats = catchAsync(async (req, res, next) => {
  let userId = req.params.userId || req.user?._id;

  // Validate userId exists
  if (!userId) {
    return next(new AppError("User ID is required", 400));
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new AppError("Invalid user ID format", 400));
  }

  // Ensure userId is a string (in case it's already an ObjectId)
  userId = userId.toString();

  const stats = await CodeSubmission.aggregate([
    { $match: { author: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        totalViews: { $sum: "$analytics.views" },
        averageViews: { $avg: "$analytics.views" },
        completedReviews: { $sum: "$analytics.completedReviews" },
        openSubmissions: {
          $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
        },
        inReviewSubmissions: {
          $sum: { $cond: [{ $eq: ["$status", "in-review"] }, 1, 0] },
        },
        completedSubmissions: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        languageDistribution: { $push: "$language" },
        categoryDistribution: { $push: "$category" },
        averageRating: { $avg: "$analytics.averageRating" },
      },
    },
  ]);

  // Get language breakdown
  const languageBreakdown = await CodeSubmission.aggregate([
    { $match: { author: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$language",
        count: { $sum: 1 },
        averageViews: { $avg: "$analytics.views" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats: stats[0] || {},
      languageBreakdown,
    },
  });
});
