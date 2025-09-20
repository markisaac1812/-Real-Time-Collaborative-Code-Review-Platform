import { Router } from "express";
import {
  createReview,
  getReviewById,
  getReviewsBySubmission,
  updateReview,
  deleteReview,
  addLineComment,
  checkReviewerAvailability,
} from "../controllers/reviewController.js";
import {
  validateCreateReview,
  validateUpdateReview,
  validateAddLineComment,
  validateAssignReviewer,
  validateAutoAssign,
} from "../middlewares/reviewValidationMiddle.js";
import { protect } from "../controllers/authController.js";

const router = Router();

//public routes
router.route("/submission/:submissionId").get(getReviewsBySubmission);
router.route("/:reviewId").get(getReviewById);

router
  .route("/reviewer/:reviewerId/availability")
  .get(checkReviewerAvailability);

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



export default router;
