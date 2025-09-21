import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';

// Create notification with user preference checks
export const createNotification = async (notificationData) => {
  try {
    const { recipient, type } = notificationData;
    
    // Get recipient's notification preferences
    const user = await User.findById(recipient)
      .select('preferences.notificationTypes preferences.emailNotifications');
    
    if (!user) return null;
    
    // Check if user wants this type of notification
    const notificationTypes = user.preferences?.notificationTypes || {};
    if (notificationTypes[type] === false) {
      return null; // User disabled this notification type
    }
    
    // Create notification
    const notification = await Notification.create(notificationData);
    
    // TODO: Send email notification if enabled
    if (user.preferences?.emailNotifications && shouldSendEmail(type)) {
      await sendEmailNotification(user, notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Batch create notifications
export const createBatchNotifications = async (notificationsData) => {
  try {
    const validNotifications = [];
    
    for (const notifData of notificationsData) {
      const user = await User.findById(notifData.recipient)
        .select('preferences.notificationTypes');
      
      if (user) {
        const notificationTypes = user.preferences?.notificationTypes || {};
        if (notificationTypes[notifData.type] !== false) {
          validNotifications.push(notifData);
        }
      }
    }
    
    if (validNotifications.length > 0) {
      await Notification.insertMany(validNotifications);
    }
    
    return validNotifications.length;
  } catch (error) {
    console.error('Error creating batch notifications:', error);
    return 0;
  }
};

// Check if email should be sent for notification type
const shouldSendEmail = (type) => {
  const emailTypes = ['review_request', 'review_completed', 'mention'];
  return emailTypes.includes(type);
};

// TODO: Implement email notification sending
const sendEmailNotification = async (user, notification) => {
  // This would integrate with email service (SendGrid, AWS SES, etc.)
  console.log(`📧 Email notification sent to ${user.email} for ${notification.type}`);
};

// Get unread notification count
export const getUnreadNotificationCount = async (userId) => {
  return await Notification.countDocuments({
    recipient: userId,
    isRead: false
  });
};

// Clean old notifications (can be run as a scheduled job)
export const cleanOldNotifications = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const result = await Notification.deleteMany({
    createdAt: { $lt: thirtyDaysAgo },
    isRead: true
  });
  
  console.log(`🧹 Cleaned ${result.deletedCount} old notifications`);
  return result.deletedCount;
};