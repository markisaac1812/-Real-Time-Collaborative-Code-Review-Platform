const userPresence = new Map(); // userId -> presence info
const submissionViewers = new Map(); // submissionId -> Set of userIds

export const handlePresence = (io, socket) => {
  const userId = socket.userId;

  // Set user as online
  userPresence.set(userId, {
    status: 'online',
    lastSeen: new Date(),
    currentActivity: null
  });

  // Handle activity updates
  socket.on('presence:activity', (data) => {
    const { activity, submissionId } = data; // activity: 'viewing', 'reviewing', 'commenting'
    
    const presence = userPresence.get(userId);
    if (presence) {
      presence.currentActivity = activity;
      presence.lastSeen = new Date();
      
      if (activity === 'viewing' && submissionId) {
        if (!submissionViewers.has(submissionId)) {
          submissionViewers.set(submissionId, new Set());
        }
        submissionViewers.get(submissionId).add(userId);
        
        // Notify others viewing the same submission
        socket.to(`submission:${submissionId}`).emit('presence:user_viewing', {
          userId,
          username: socket.user.username,
          activity
        });
      }
    }
  });

  // Handle away/back status
  socket.on('presence:away', () => {
    const presence = userPresence.get(userId);
    if (presence) {
      presence.status = 'away';
      presence.lastSeen = new Date();
    }
    
    socket.broadcast.emit('presence:user_away', {
      userId,
      username: socket.user.username
    });
  });

  socket.on('presence:back', () => {
    const presence = userPresence.get(userId);
    if (presence) {
      presence.status = 'online';
      presence.lastSeen = new Date();
    }
    
    socket.broadcast.emit('presence:user_back', {
      userId,
      username: socket.user.username
    });
  });

  // Get online users in submission
  socket.on('presence:get_online_users', (data) => {
    const { submissionId } = data;
    const viewers = submissionViewers.get(submissionId) || new Set();
    
    const onlineUsers = Array.from(viewers).map(uid => {
      const presence = userPresence.get(uid);
      const connectedUser = connectedUsers.get(uid);
      
      return {
        userId: uid,
        username: connectedUser?.username,
        status: presence?.status || 'offline',
        activity: presence?.currentActivity,
        lastSeen: presence?.lastSeen
      };
    });

    socket.emit('presence:online_users_list', {
      submissionId,
      users: onlineUsers,
      count: onlineUsers.length
    });
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    // Set user as offline
    const presence = userPresence.get(userId);
    if (presence) {
      presence.status = 'offline';
      presence.lastSeen = new Date();
      presence.currentActivity = null;
    }

    // Remove from all submission viewers
    submissionViewers.forEach((viewers, submissionId) => {
      if (viewers.has(userId)) {
        viewers.delete(userId);
        
        // Notify others in the submission
        socket.to(`submission:${submissionId}`).emit('presence:user_left', {
          userId,
          username: socket.user.username
        });
      }
    });

    // Clean up empty submission viewer sets
    submissionViewers.forEach((viewers, submissionId) => {
      if (viewers.size === 0) {
        submissionViewers.delete(submissionId);
      }
    });
  });
};

// Utility functions for presence
export const getUserPresence = (userId) => {
  return userPresence.get(userId) || { status: 'offline', lastSeen: null };
};

export const getOnlineUsersCount = () => {
  let onlineCount = 0;
  userPresence.forEach(presence => {
    if (presence.status === 'online') onlineCount++;
  });
  return onlineCount;
};

export const getSubmissionViewers = (submissionId) => {
  const viewers = submissionViewers.get(submissionId) || new Set();
  return Array.from(viewers).map(userId => {
    const presence = userPresence.get(userId);
    return {
      userId,
      ...presence
    };
  });
};