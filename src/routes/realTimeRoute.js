import { Router } from "express";
import {
  getOnlineUsers,
  checkUserOnlineStatus,
  getSubmissionViewers,
  sendSystemNotification,
  broadcastToRoom,
  getWebSocketStats
} from "../controllers/realTimeController.js";
import { protect, restrictedTo } from "../controllers/authController.js";
const router = Router();

//public routes
// Get online users count (public info)
router.get("/users/online/count", (req, res) => {
    res.json({
      status: "success",
      data: {
        count: getOnlineUsersCount(),
        timestamp: new Date()
      }
    });
  });

//private routes
router.use(protect);

// Get online users
router.get("/users/online", getOnlineUsers);

// Check user online status
router.get("/users/:userId/status", checkUserOnlineStatus);

// Get submission viewers
router.get("/submissions/:submissionId/viewers", getSubmissionViewers);

// Send system notification
router.post("/notifications/send", restrictedTo('admin'), sendSystemNotification);

// WebSocket statistics (admin only)
router.get("/stats", restrictedTo('admin'), getWebSocketStats);

// Broadcast to room (admin only)
router.post("/broadcast", restrictedTo('admin'), broadcastToRoom);

export default router;