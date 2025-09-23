const connectedUsers = new Map(); // userId -> socket info
const userRooms = new Map(); // userId -> Set of rooms

export const handleConnection = (io, socket) => {
  const userId = socket.userId;
  
  // Store connected user info
  connectedUsers.set(userId, {
    socketId: socket.id,
    username: socket.user.username,
    profile: socket.user.profile,
    connectedAt: new Date(),
    lastActivity: new Date()
  });

  // Initialize user rooms
  if (!userRooms.has(userId)) {
    userRooms.set(userId, new Set());
  }

  // Join user's personal notification room
  socket.join(`user:${userId}`);

  // Emit user online status
  socket.broadcast.emit('user:online', {
    userId,
    username: socket.user.username,
    profile: socket.user.profile
  });

  // Handle room joining
  socket.on('join:submission', (data) => {
    const { submissionId } = data;
    const roomId = `submission:${submissionId}`;
    
    socket.join(roomId);
    userRooms.get(userId).add(roomId);
    
    // Notify others in the room
    socket.to(roomId).emit('user:joined_submission', {
      userId,
      username: socket.user.username,
      submissionId
    });
    
    console.log(`📝 ${socket.user.username} joined submission ${submissionId}`);
  });

  // Handle room leaving
  socket.on('leave:submission', (data) => {
    const { submissionId } = data;
    const roomId = `submission:${submissionId}`;
    
    socket.leave(roomId);
    userRooms.get(userId).delete(roomId);
    
    // Notify others in the room
    socket.to(roomId).emit('user:left_submission', {
      userId,
      username: socket.user.username,
      submissionId
    });
  });

  // Handle review session joining
  socket.on('join:review_session', (data) => {
    const { submissionId, reviewId } = data;
    const roomId = `review:${reviewId}`;
    
    socket.join(roomId);
    userRooms.get(userId).add(roomId);
    
    socket.to(roomId).emit('user:joined_review', {
      userId,
      username: socket.user.username,
      reviewId,
      submissionId
    });
    
    console.log(`🔍 ${socket.user.username} joined review session ${reviewId}`);
  });

  // Handle typing indicators
  socket.on('typing:start', (data) => {
    const { roomId, context } = data; // context: 'comment', 'review', etc.
    
    socket.to(roomId).emit('user:typing', {
      userId,
      username: socket.user.username,
      context,
      timestamp: new Date()
    });
  });

  socket.on('typing:stop', (data) => {
    const { roomId, context } = data;
    
    socket.to(roomId).emit('user:stopped_typing', {
      userId,
      username: socket.user.username,
      context
    });
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    // Remove from connected users
    connectedUsers.delete(userId);
    
    // Leave all rooms
    const rooms = userRooms.get(userId) || new Set();
    rooms.forEach(roomId => {
      socket.to(roomId).emit('user:left', {
        userId,
        username: socket.user.username
      });
    });
    
    // Clear user rooms
    userRooms.delete(userId);
    
    // Emit user offline status
    socket.broadcast.emit('user:offline', {
      userId,
      username: socket.user.username
    });
  });
};

export const getConnectedUsers = () => {
    return Array.from(connectedUsers.values());
  };
  
  export const isUserOnline = (userId) => {
    return connectedUsers.has(userId);
  };
  
  export const getUsersInRoom = (roomId) => {
    // This would need to be implemented using Socket.io adapter
    // For now, we'll track it manually
    const users = [];
    connectedUsers.forEach((userInfo, userId) => {
      const rooms = userRooms.get(userId);
      if (rooms && rooms.has(roomId)) {
        users.push(userInfo);
      }
    });
    return users;
  };