import CodeSubmission from "../models/CodeSubmission.js";
import Review from "../models/Review.js";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { updateUserReputation } from './../utils/databaseHelpers.js'

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
  await updateUserReputation(req.user._id, 5,"submission_created");
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
    visibility = 'public',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter object
  const filter = {};

  // Public visibility by default, unless user is viewing their own submissions
  if (req.user && author === req.user._id.toString()) {
    // User viewing their own submissions - can see all visibilities
    filter.author = req.user._id;
  } else {
    // Public view - only show public submissions
    filter.visibility = 'public';
    if (author) filter.author = author;
  }

  // Add other filters
  if (language) filter.language = language;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  // Handle tags filter (array of tags)
  if (tags) {
    const tagsArray = tags.split(',').map(tag => tag.trim());
    filter.tags = { $in: tagsArray };
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute query with pagination
  const submissions = await CodeSubmission.find(filter)
    .populate('author', 'username profile reputation')
    .populate('reviewers.user', 'username profile reputation')
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
      hasPrev: page > 1
    },
    data: { submissions }
  });
})

export const getSubmissionById = catchAsync(async (req, res, next) => {
  const id  = req.params.id;

  const submission = await CodeSubmission.findById(id)
    .populate('author', 'username profile reputation createdAt')
    .populate('reviewers.user', 'username profile reputation')
    .populate({
      path: 'reviews',
      populate: {
        path: 'reviewer',
        select: 'username profile reputation'
      }
    });

  if (!submission) {
    return next(new AppError("Submission not found", 404));
  }

  // Check visibility permissions
  if (submission.visibility === 'private' && 
      (!req.user || submission.author._id.toString() !== req.user._id.toString())) {
    return next(new AppError("You don't have permission to view this submission", 403));
  }

  // Increment view count (only if not the author viewing their own submission)
  if (!req.user || submission.author._id.toString() !== req.user._id.toString()) {
    await submission.incrementViews();
  }

  res.status(200).json({
    status: "success",
    data: { submission }
  });
});

// UPDATE SUBMISSION (Author only)
export const updateSubmission = catchAsync(async (req, res, next) => {
  const id  = req.params.id;

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
  if (submission.status === 'completed') {
    return next(new AppError("Cannot update completed submissions", 400));
  }

  // Fields that can be updated
  const allowedFields = ['title', 'description', 'code', 'tags', 'category', 'priority', 'visibility'];
  const updateObj = {};

  // Filter only allowed fields
  Object.keys(req.body).forEach(key => {
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
  ).populate('author', 'username profile reputation');

  res.status(200).json({
    status: "success",
    data: { submission: updatedSubmission }
  });
});

// DELETE SUBMISSION (Soft delete - change status to closed)
export const deleteSubmission = catchAsync(async (req, res, next) => {
  const id  = req.params.id;

  const submission = await CodeSubmission.findById(id);
  
  if (!submission) {
    return next(new AppError("Submission not found", 404));
  }

  // Check permissions (author or admin)
  if (submission.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError("You can only delete your own submissions", 403));
  }

  // Soft delete by changing status
  submission.status = 'closed';
  await submission.save();

  res.status(200).json({
    status: "success",
    message: "Submission deleted successfully"
  });
});

// GET SUBMISSIONS BY SPECIFIC USER
export const getSubmissionsByUser = catchAsync(async (req, res, next) => {
  const  userId  = req.params.userId;
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
    filter.visibility = 'public';
  }

  const skip = (page - 1) * limit;

  const submissions = await CodeSubmission.find(filter)
    .populate('author', 'username profile reputation')
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
      totalResults: totalSubmissions
    },
    data: {
      user: {
        id: user._id,
        username: user.username,
        profile: user.profile,
        reputation: user.reputation
      },
      submissions
    }
  });
});
