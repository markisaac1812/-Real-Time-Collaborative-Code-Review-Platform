import {Router } from "express"
import { getSubmissions,createSubmission } from "../controllers/codeSubmissionController.js";
import { protect } from "../controllers/authController.js";
const router = Router();

router.route("/").get(getSubmissions);
router.use(protect)
router.route("/").post(createSubmission);

export default router;

