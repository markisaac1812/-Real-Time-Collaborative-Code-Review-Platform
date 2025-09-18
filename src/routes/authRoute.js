import { Router } from "express";
import {
  signup,
  login,
  refresh,
  protect,
  logout,
  deactivateAccount,
  forgotPassword,
  resetPassword,
  createAdmin
} from "../controllers/authController.js";
const router = Router();

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/refresh").post(refresh);
router.route("/forgetPassword").post(forgotPassword);
router.route("/resetPassword/:token").post(resetPassword);
router.route("/create-admin").post(createAdmin); // Development only
router.route("/logout").post(protect, logout);
router.route("/deactivate").post(protect,deactivateAccount);

export default router;
