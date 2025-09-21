import { Router } from "express";
import {
  createReview,
  getReviewById,
  getReviewsBySubmission,
  updateReview,
  deleteReview,
  addLineComment,
  checkReviewerAvailability,
  markHelpful,
  getReviewsByReviewer,
  getReviewStats,
  getSuggestedReviewersForSubmission,
  autoAssignReviewers
} from "../controllers/reviewController.js";
import {
  validateCreateReview,
  validateUpdateReview,
  validateAddLineComment,
  validateAutoAssign,
} from "../middlewares/reviewValidationMiddle.js";
import { protect,restrictedTo } from "../controllers/authController.js";

const router = Router();

//public routes
router.route("/submission/:submissionId").get(getReviewsBySubmission);
router.route("/:reviewId").get(getReviewById);

// Get review statistics
router.route("/stats/overview").get(getReviewStats);

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

// mark review as helpful
router
  .route("/:reviewId/helpful")
  .post(markHelpful);

// Get reviews by specific reviewer
router.get("/reviewer/:reviewerId", getReviewsByReviewer);

// Get current user's reviews
router.get("/my/reviews", getReviewsByReviewer);

// Get personal review statistics
router.get("/stats/me", getReviewStats);

// Get suggested reviewers for submission
router.get("/submission/:submissionId/suggested-reviewers", getSuggestedReviewersForSubmission);

// Auto assign reviewers
router.route("/submission/:submissionId/auto-assign").post(validateAutoAssign, autoAssignReviewers);

// Advanced review analytics (admin only)
router.route("/stats/detailed").get(restrictedTo('admin'), getReviewStats);
export default router;
