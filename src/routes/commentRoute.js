import {Router} from "express";
import { createComment, getComments } from "../controllers/commentController.js";
import { validateCreateComment } from "../middlewares/commentValidationMiddle.js";
import { protect } from "../controllers/authController.js";
const router = Router();

//public routes
// Get comments for a review
router.route("/review/:reviewId").get(getComments);

//private routes
router.use(protect);
router.route('/review/:reviewId').post(validateCreateComment,createComment);

export default router;