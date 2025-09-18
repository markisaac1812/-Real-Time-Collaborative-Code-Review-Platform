import CodeSubmission from "../models/CodeSubmission.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

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
  await updateReputation(req.user._id, 5,"submission_created");
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
