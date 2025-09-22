import { Router } from "express";
import { getNotifications,markAsRead,markAllAsRead } from "../controllers/notificationController.js";
import { protect } from "../controllers/authController.js";
const router = Router();

//protected routes
router.use(protect);

// Get user's notifications
router.route('/').get(getNotifications);

// Mark notification as read
router.route('/:notificationId/read').put(markAsRead);

// Mark all notifications as read
router.route('/mark-all-read').put(markAllAsRead);

export default router;