import {Router} from "express";
import { createComment, getComments, getCommentById } from "../controllers/commentController.js";
import { validateCreateComment } from "../middlewares/commentValidationMiddle.js";
import { protect } from "../controllers/authController.js";
const router = Router();

//public routes

// Get comments for a review
router.route("/review/:reviewId").get(getComments);
// Get single comment by ID
router.route("/:commentId").get(getCommentById);

//private routes
router.use(protect);
router.route('/review/:reviewId').post(validateCreateComment,createComment);

export default router;