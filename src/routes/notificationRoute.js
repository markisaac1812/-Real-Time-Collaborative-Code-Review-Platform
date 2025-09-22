import { Router } from "express";
import { getNotifications } from "../controllers/notificationController.js";
import { protect } from "../controllers/authController.js";
const router = Router();

//protected routes
router.use(protect);

// Get user's notifications
router.route('/').get(getNotifications);

export default router;