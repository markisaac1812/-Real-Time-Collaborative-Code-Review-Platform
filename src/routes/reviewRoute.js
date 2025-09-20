import { Router } from "express";
import {
  createReview,
  getReviewById,
  getReviewsBySubmission,
  updateReview,
  deleteReview,
  addLineComment,
  manualAssignReviewer
} from "../controllers/reviewController.js";
import {
  validateCreateReview,
  validateUpdateReview,
  validateAddLineComment,
  validateAssignReviewer
} from "../middlewares/reviewValidationMiddle.js";
import { protect } from "../controllers/authController.js";

const router = Router();

//public routes
router.route("/submission/:submissionId").get(getReviewsBySubmission);
router.route("/:reviewId").get(getReviewById);

router.use(protect);

//protected routes
// create review for a certain submissoin
router
  .route("/submission/:submissionId")
  .post(validateCreateReview, createReview);

// update,Delete review for a certain submissoin
router
  .route("/:reviewId")
  .put(validateUpdateReview, updateReview)
  .delete(deleteReview);

// add line comment to existing review
router
  .route("/:reviewId/line-comment")
  .post(validateAddLineComment, addLineComment);

// assign reviewer to submission
router
  .route("/submission/:submissionId/assign")
  .post(validateAssignReviewer, manualAssignReviewer);

export default router;
