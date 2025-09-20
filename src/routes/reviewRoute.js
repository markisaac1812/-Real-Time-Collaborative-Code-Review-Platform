import { Router } from "express";
import { createReview,getReviewById,getReviewsBySubmission,updateReview,deleteReview } from "../controllers/reviewController.js";
import { validateCreateReview,validateUpdateReview } from "../middlewares/reviewValidationMiddle.js";
import { protect } from "../controllers/authController.js";

const router = Router();

router.route("/submission/:submissionId").get(getReviewsBySubmission);
router.route("/:reviewId").get(getReviewById);



router.use(protect);

// create review for a certain submissoin
router.route("/submission/:submissionId").post(validateCreateReview, createReview);

// update,Delete review for a certain submissoin
router.route("/:reviewId").put(validateUpdateReview, updateReview).delete(deleteReview);

export default router;
