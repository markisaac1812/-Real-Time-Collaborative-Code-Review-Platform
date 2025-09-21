import { Router } from "express";
import { toggleFollow, getFollowers } from "../controllers/socialController.js";
import { protect, restrictedTo } from "../controllers/authController.js";

const router = Router();

//public routes

// Get user's followers
router.route("/:userId/followers").get(getFollowers);


//private routes
router.use(protect);

// Follow/unfollow user
router.route("/follow/:userId").post(toggleFollow);

export default router;