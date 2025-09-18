import { Router } from "express";
import {
  getSubmissions,
  createSubmission,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
  getSubmissionsByUser,
  searchSubmissions,
  getSubmissionAnalytics,
  getUserSubmissionStats,
  toggleVisibility,
  assignReviewer,
} from "../controllers/codeSubmissionController.js";
import {
  validateCreateSubmission,
  validateUpdateSubmission,
  validateAssignReviewer,
  validateSearch,
} from "../middlewares/submissionValidationMiddle.js";
import { protect, restrictedTo } from "../controllers/authController.js";
const router = Router();

router.route("/").get(getSubmissions);
router.route("/search").get(validateSearch, searchSubmissions);
router.route("/user/:userId").get(getSubmissionsByUser);
router.route("/:id").get(getSubmissionById);
router.route("/analytics/overview").get(getSubmissionAnalytics);

router.use(protect);
router.route("/").post(validateCreateSubmission, createSubmission);
router
  .route("/:id")
  .put(validateUpdateSubmission, updateSubmission)
  .delete(deleteSubmission);
router
  .route("/:id/assign-reviewers")
  .post(validateAssignReviewer, assignReviewer);
router.route("/:id/visibility").put(toggleVisibility);
router.route("/stats/me").get(getUserSubmissionStats);
router.route("/stats/:userId").get(getUserSubmissionStats);
router
  .route("/analytics/detailed")
  .get(restrictedTo("admin"), getSubmissionAnalytics);
export default router;
