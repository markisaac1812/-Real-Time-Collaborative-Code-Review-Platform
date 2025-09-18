import { Router } from "express";
import {
  getSubmissions,
  createSubmission,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
} from "../controllers/codeSubmissionController.js";
import {
  validateCreateSubmission,
  validateUpdateSubmission,
  validateAssignReviewer,
  validateSearch,
} from "../middlewares/submissionValidationMiddle.js";
import { protect } from "../controllers/authController.js";
const router = Router();

router.route("/").get(getSubmissions);
router.route("/:id").get(getSubmissionById);

router.use(protect);
router.route("/").post(validateCreateSubmission, createSubmission);
router
  .route("/:id")
  .put(validateUpdateSubmission, updateSubmission)
  .delete(deleteSubmission);

export default router;
