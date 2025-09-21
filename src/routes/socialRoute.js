import { Router } from "express";
import { toggleFollow } from "../controllers/socialController.js";
import { protect, restrictedTo } from "../controllers/authController.js";

const router = Router();




//private routes
router.use(protect);
// Follow/unfollow user
router.route("/follow/:userId").post(toggleFollow);

export default router;