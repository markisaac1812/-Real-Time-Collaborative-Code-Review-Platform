import Notification from "../models/notification.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import User from "../models/userModel.js";

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

// MARK NOTIFICATION AS READ
export const markAsRead = catchAsync(async (req, res, next) => {
    const { notificationId } = req.params;
  
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return next(new AppError("Notification not found", 404));
    }
  
    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return next(new AppError("You can only mark your own notifications as read", 403));
    }
  
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }
  
    res.status(200).json({
      status: "success",
      message: "Notification marked as read",
      data: { notification }
    });
  });
// MARK ALL NOTIFICATIONS AS READ
export const markAllAsRead = catchAsync(async (req, res, next) => {
    const result = await Notification.updateMany(
      { 
        recipient: req.user._id, 
        isRead: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );
  
    res.status(200).json({
      status: "success",
      message: `Marked ${result.modifiedCount} notifications as read`,
      data: { 
        markedCount: result.modifiedCount 
      }
    });
  });

// DELETE NOTIFICATION
export const deleteNotification = catchAsync(async (req, res, next) => {
    const { notificationId } = req.params;
  
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return next(new AppError("Notification not found", 404));
    }
  
    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return next(new AppError("You can only delete your own notifications", 403));
    }
  
    await Notification.findByIdAndDelete(notificationId);
  
    res.status(200).json({
      status: "success",
      message: "Notification deleted successfully"
    });
  });  

// DELETE ALL READ NOTIFICATIONS
export const deleteReadNotifications = catchAsync(async (req, res, next) => {
    const result = await Notification.deleteMany({
      recipient: req.user._id,
      isRead: true
    });
  
    res.status(200).json({
      status: "success",
      message: `Deleted ${result.deletedCount} read notifications`,
      data: { 
        deletedCount: result.deletedCount 
      }
    });
  }); 
  
// GET NOTIFICATION SETTINGS
export const getNotificationSettings = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id)
      .select('preferences');
  
    const settings = {
      emailNotifications: user.preferences?.emailNotifications ?? true,
      notificationTypes: user.preferences?.notificationTypes ?? {
        review_request: true,
        review_completed: true,
        comment_added: true,
        submission_updated: true,
        mention: true,
        follow: true,
        helpful_vote: true
      }
    };
  
    res.status(200).json({
      status: "success",
      data: { settings }
    });
  });  
