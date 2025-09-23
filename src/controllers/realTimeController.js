import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import {
  getConnectedUsers,
  isUserOnline,
  getUsersInRoom,
} from "../sockets/handlers/connectionHandler.js";
import {
  getUserPresence,
  getOnlineUsersCount,
  getSubmissionViewers as getSubmissionViewersFromPresence,
} from "../sockets/handlers/presenceHandler.js";
import { sendRealTimeNotification } from "../sockets/handlers/notificationHandler.js";

//GET ONLINE USERS
export const getOnlineUsers = catchAsync(async (req, res, next) => {
  const onlineUsers = getConnectedUsers();
  const totalOnline = getOnlineUsersCount();

  res.status(200).json({
    status: "success",
    data: {
      users: onlineUsers,
      totalOnline,
      timestamp: new Date()
    }
  });
});

// CHECK IF USER IS ONLINE
export const checkUserOnlineStatus = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    
    const isOnline = isUserOnline(userId);
    const presence = getUserPresence(userId);
  
    res.status(200).json({
      status: "success",
      data: {
        userId,
        isOnline,
        presence,
        timestamp: new Date()
      }
    });
  });
  
  // GET SUBMISSION VIEWERS
  export const getSubmissionViewers = catchAsync(async (req, res, next) => {
    const { submissionId } = req.params;
    
    const viewers = getSubmissionViewersFromPresence(submissionId);
  
    res.status(200).json({
      status: "success",
      data: {
        submissionId,
        viewers,
        viewerCount: viewers.length,
        timestamp: new Date()
      }
    });
  });
  
  // SEND REAL-TIME NOTIFICATION (Admin/System use)
  export const sendSystemNotification = catchAsync(async (req, res, next) => {
    const { recipientId, type, message, data } = req.body;
    const io = req.app.get('io');
  
    if (req.user.role !== 'admin' && req.user._id.toString() !== recipientId) {
      return next(new AppError("Not authorized to send notifications", 403));
    }
  
    const notification = await sendRealTimeNotification(io, {
      recipient: recipientId,
      sender: req.user._id,
      type,
      data: {
        ...data,
        message
      }
    });
  
    res.status(200).json({
      status: "success",
      message: "Real-time notification sent",
      data: { notification }
    });
  });
  
  // BROADCAST MESSAGE TO ROOM (Admin only)
  export const broadcastToRoom = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
      return next(new AppError("Admin access required", 403));
    }
  
    const { roomId, event, data, message } = req.body;
    const io = req.app.get('io');
  
    io.to(roomId).emit(event, {
      type: 'system_broadcast',
      data,
      message,
      timestamp: new Date()
    });
  
    res.status(200).json({
      status: "success",
      message: `Broadcast sent to room: ${roomId}`
    });
  });
  
  // GET WEBSOCKET STATISTICS
  export const getWebSocketStats = catchAsync(async (req, res, next) => {
    const io = req.app.get('io');
    
    const stats = {
      connectedClients: io.engine.clientsCount,
      onlineUsers: getOnlineUsersCount(),
      totalRooms: io.sockets.adapter.rooms.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    };
  
    res.status(200).json({
      status: "success",
      data: { stats }
    });
  });
