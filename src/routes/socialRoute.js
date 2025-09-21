import { Router } from "express";
import { toggleFollow, getFollowers, getFollowing } from "../controllers/socialController.js";
import { protect, restrictedTo } from "../controllers/authController.js";

const router = Router();

//public routes

// Get user's followers
router.route("/:userId/followers").get(getFollowers);

// Get user's following
router.route("/:userId/following").get(getFollowing);


//private routes
router.use(protect);

// Follow/unfollow user
router.route("/follow/:userId").post(toggleFollow);

export default router;