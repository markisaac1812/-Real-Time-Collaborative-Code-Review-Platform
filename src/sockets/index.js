import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { handleConnection } from './handlers/connectionHandler.js';
import { handleNotifications } from './handlers/notificationHandler.js';

// Socket authentication middleware
const socketAuth = async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('No token provided'));
      }
  
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }
  
      // Attach user to socket
      socket.userId = user._id.toString();
      socket.user = user;
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  };
  
  // Initialize Socket.io server
  export const initSocketServer = (httpServer) => {
    const io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
  
    // Apply authentication middleware
    io.use(socketAuth);
  
    // Global connection handler
    io.on('connection', (socket) => {
      console.log(`👤 User ${socket.user.username} connected (${socket.id})`);
  
      // Initialize handlers
      handleConnection(io, socket);
      handleNotifications(io, socket);
      handleReviews(io, socket);
      handlePresence(io, socket);
  
      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`👋 User ${socket.user.username} disconnected: ${reason}`);
        // Cleanup handled in presence handler
      });
    });
  
    return io;
  };