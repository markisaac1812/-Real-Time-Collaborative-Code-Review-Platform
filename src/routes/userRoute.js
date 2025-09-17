import { Router } from "express";
import { getProfile,getProfileForSignedUser, updateProfileForSignedUser } from "../controllers/userController.js";
import { protect } from "../controllers/authController.js";
const router = Router();

router.use(protect);

router.route("/profile").get(getProfileForSignedUser).put(updateProfileForSignedUser);

export default router;