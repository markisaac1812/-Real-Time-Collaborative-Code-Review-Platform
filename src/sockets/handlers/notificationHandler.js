import Notification from '../../models/notification.js';
import { createNotification } from '../../utils/notificationHelper.js';

export const handleNotifications = (io, socket) => {
  // Send any pending notifications on connect
  socket.on('notifications:fetch_unread', async () => {
    try {
      const unreadNotifications = await Notification.find({
        recipient: socket.userId,
        isRead: false
      })
        .populate('sender', 'username profile')
        .populate('data.submissionId', 'title')
        .sort({ createdAt: -1 })
        .limit(20);

      socket.emit('notifications:unread_list', {
        notifications: unreadNotifications,
        count: unreadNotifications.length
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  socket.on('notifications:mark_read', async (data) => {
    try {
      const { notificationId } = data;
      
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: socket.userId },
        { isRead: true, readAt: new Date() }
      );

      // Send updated unread count to user
      const unreadCount = await Notification.countDocuments({
        recipient: socket.userId,
        isRead: false
      });

      socket.emit('notifications:unread_count', { count: unreadCount });
    } catch (error) {
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  });

  // Mark all as read
  socket.on('notifications:mark_all_read', async () => {
    try {
      await Notification.updateMany(
        { recipient: socket.userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      socket.emit('notifications:unread_count', { count: 0 });
      socket.emit('notifications:all_marked_read');
    } catch (error) {
      socket.emit('error', { message: 'Failed to mark all notifications as read' });
    }
  });
};

// Enhanced notification helper for real-time delivery
export const sendRealTimeNotification = async (io, notificationData) => {
  try {
    // Create notification in database
    const notification = await createNotification(notificationData);
    
    if (!notification) return;

    // Populate notification for sending
    await notification.populate('sender', 'username profile');
    if (notification.data.submissionId) {
      await notification.populate('data.submissionId', 'title');
    }

    // Send real-time notification to recipient
    io.to(`user:${notification.recipient}`).emit('notification:new', {
      notification,
      timestamp: new Date()
    });

    // Update unread count
    const unreadCount = await Notification.countDocuments({
      recipient: notification.recipient,
      isRead: false
    });

    io.to(`user:${notification.recipient}`).emit('notifications:unread_count', {
      count: unreadCount
    });

    return notification;
  } catch (error) {
    console.error('Failed to send real-time notification:', error);
  }
};