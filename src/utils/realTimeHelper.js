export const emitToUser = (io, userId, event, data) => {
    io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  };
  
  export const emitToRoom = (io, roomId, event, data) => {
    io.to(roomId).emit(event, {
      ...data,
      timestamp: new Date()
    });
  };
  
  export const emitToSubmission = (io, submissionId, event, data) => {
    emitToRoom(io, `submission:${submissionId}`, event, data);
  };