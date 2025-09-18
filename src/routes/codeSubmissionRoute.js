import { Router } from "express";
import {
  getSubmissions,
  createSubmission,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
  getSubmissionsByUser,
  searchSubmissions,
  assignReviewer,
  getSubmissionAnalytics,
  toggleVisibility,
} from "../controllers/codeSubmissionController.js";

import {
  validateCreateSubmission,
  validateUpdateSubmission,
  validateAssignReviewer,
  validateSearch,
} from "../middlewares/submissionValidationMiddle.js";

import { protect, restrictedTo } from "../controllers/authController.js";
const router = Router();

//public routes
router.route("/").get(getSubmissions);
router.route("/search").get(validateSearch, searchSubmissions);
router.route("/user/:userId").get(getSubmissionsByUser);
router.route("/:id").get(getSubmissionById);

router.use(protect);

//protected routes
router.route("/").post(validateCreateSubmission, createSubmission);
router
  .route("/:id")
  .put(validateUpdateSubmission, updateSubmission)
  .delete(deleteSubmission);
router
  .route("/:id/assign-reviewers")
  .post(validateAssignReviewer, assignReviewer);
router
  .route("/:id/visibility")
  .put(toggleVisibility);
router
  .route("/analytics/overview")
  .get(restrictedTo("admin"), getSubmissionAnalytics);


export default router;
