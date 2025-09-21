import { Router } from "express";
import {
  toggleFollow,
  getFollowers,
  getFollowing,
  getActivityFeed,
  updateReputationSystem,
  getSocialStats
} from "../controllers/socialController.js";
import { protect, restrictedTo } from "../controllers/authController.js";

const router = Router();

//public routes

// Get user's followers
router.route("/:userId/followers").get(getFollowers);
// Get user's following
router.route("/:userId/following").get(getFollowing);
// Get social stats for user
router.route("/:userId/stats").get(getSocialStats);


//private routes
router.use(protect);

// Follow/unfollow user
router.route("/follow/:userId").post(toggleFollow);
// Get activity feed
router.route("/feed/activity").get(getActivityFeed);
// Update own reputation
router.route("/reputation/update").post(updateReputationSystem);
// Update any user's reputation (admin only)
router.route("/reputation/:userId/update").post(restrictedTo('admin'), updateReputationSystem);


export default router;
