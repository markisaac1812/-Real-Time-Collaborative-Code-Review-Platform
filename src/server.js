import mongoose from "mongoose";
import app from "./app.js";
import { initSocketServer } from "./sockets/index.js";
import { sendSystemNotification } from "./controllers/realTimeController.js";
import { testRedisConnection, closeRedisConnections } from "./config/redis.js";
import { closeQueues } from "./config/queue.js";
import { startPerformanceMonitoring } from "./middlewares/performance.js";
import connectDB from "./config/database.js";
import cron from "node-cron";
import { queueDailyAnalytics } from "./jobs/analyticsJobs.js";


process.on("uncaughtException", (err) => {
  console.log("unhandled exception shutting down");
  console.log(err.name, err.message);
  process.exit(1);
});

let server; // Declare server variable outside the function

const startServer = async()=>{
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Test Redis connection
    await testRedisConnection();

     // Start server
    const port = process.env.PORT;
    server = app.listen(port, () => {
      console.log(`app running on port ${port}`);
      console.log(`📊 MongoDB connected successfully`);
      console.log(`📡 Redis connected successfully`);
      console.log(`⚡ WebSocket server initialized`);
      console.log(`🔧 Background jobs initialized`);
    });

     // Initialize Socket.io
     const io = initSocketServer(server);
     app.set('io', io);

    // Start performance monitoring
    startPerformanceMonitoring();

     // Schedule daily analytics
     cron.schedule('0 1 * * *', async () => { // 1 AM daily
      await queueDailyAnalytics();
      console.log('📊 Daily analytics job queued');
    });

   // Handle unhandled promise rejections
   process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
      console.log('HTTP server closed');
      
      try {
        await closeQueues();
        await closeRedisConnections();
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));


  } catch (error) {
    console.error("failed to start server",error);
    process.exit(1);
}
}


startServer();

export default server;
