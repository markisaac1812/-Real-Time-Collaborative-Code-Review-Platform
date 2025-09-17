import { Router } from "express";
import {
  getLeaderboard,
  getProfileForSignedUser,
  getProfileWithoutLoggingIn,
  getUserStats,
  searchUsers,
  updateProfileForSignedUser,
} from "../controllers/userController.js";
import { protect } from "../controllers/authController.js";
const router = Router();

router.route("/search").get(searchUsers);
router.route("/profile/:id").get(getProfileWithoutLoggingIn);
router.route("/leaderboard").get(getLeaderboard);

router.use(protect);

router
  .route("/profile")
  .get(getProfileForSignedUser)
  .put(updateProfileForSignedUser);
router.route("/stats").get(getUserStats);

export default router;
