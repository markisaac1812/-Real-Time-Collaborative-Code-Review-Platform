import { Router } from "express";
import { createReview } from "../controllers/reviewController.js";
import { validateCreateReview } from "../middlewares/reviewValidationMiddle.js";
import { protect,restrictedTo } from "../controllers/authController.js";

const router = Router();

router.use(protect);

// create review for a certain submissoin
router.route("/submission/:submissionId").post(validateCreateReview, createReview);

export default router;
