import { Router } from "express";
import {
  createComment,
  getComments,
  getCommentById,
  updateComment,
  deleteComment,
  reactToComment
} from "../controllers/commentController.js";
import {
  validateCreateComment,
  validateUpdateComment,
} from "../middlewares/commentValidationMiddle.js";
import { protect } from "../controllers/authController.js";
const router = Router();

//public routes

// Get comments for a review
router.route("/review/:reviewId").get(getComments);
// Get single comment by ID
router.route("/:commentId").get(getCommentById);

//private routes
router.use(protect);

//create comment
router.route("/review/:reviewId").post(validateCreateComment, createComment);

//update comment
router.route("/:commentId").put(validateUpdateComment, updateComment);

//delete comment
router.route("/:commentId").delete(deleteComment);

// React to comment (like/dislike)
router.post("/:commentId/react", reactToComment);


export default router;
