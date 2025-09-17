import { Router } from "express";
import { getProfile,getProfileForSignedUser } from "../controllers/userController.js";
import { protect } from "../controllers/authController.js";
const router = Router();

router.use(protect);

router.route("/profile").get(getProfileForSignedUser);

export default router;