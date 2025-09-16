import { Router } from "express";
import { signup,login, refresh } from "../controllers/authController.js";
const router = Router();

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/refresh").post(refresh);

export default router;