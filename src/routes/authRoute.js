import { Router } from "express";
import {
  signup,
  login,
  refresh,
  protect,
  logout,
} from "../controllers/authController.js";
const router = Router();

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/refresh").post(refresh);
router.route("/logout").post(protect, logout);

export default router;
