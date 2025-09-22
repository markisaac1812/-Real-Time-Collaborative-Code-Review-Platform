import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  getNotificationSettings,
} from "../controllers/notificationController.js";
import { protect } from "../controllers/authController.js";
const router = Router();

//protected routes
router.use(protect);

// Get user's notifications
router.route("/").get(getNotifications);

// Mark notification as read
router.route("/:notificationId/read").put(markAsRead);

// Mark all notifications as read
router.route("/mark-all-read").put(markAllAsRead);

// Delete specific notification
router.route("/:notificationId").delete(deleteNotification);

// Delete all read notifications
router.route("/read/cleanup").delete(deleteReadNotifications);

// Get notification settings
router.route("/settings").get(getNotificationSettings);

export default router;
