import Notification from "../models/notification.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// GET USER'S NOTIFICATIONS
export const getNotifications = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;

  // Build filter
  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') {
    filter.isRead = false;
  }

  const skip = (page - 1) * limit;

  const notifications = await Notification.find(filter)
    .populate('sender', 'username profile')
    .populate('data.submissionId', 'title')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const totalNotifications = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({ 
    recipient: req.user._id, 
    isRead: false 
  });

  const totalPages = Math.ceil(totalNotifications / limit);

  res.status(200).json({
    status: "success",
    results: notifications.length,
    unreadCount,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalResults: totalNotifications,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    data: { notifications }
  });
});