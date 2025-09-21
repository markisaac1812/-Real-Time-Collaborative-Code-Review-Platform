import {Router} from "express";
import { createComment } from "../controllers/commentController.js";
import { validateCreateComment } from "../middlewares/commentValidationMiddle.js";
import { protect } from "../controllers/authController.js";
const router = Router();

//public routes


//private routes
router.use(protect);
router.post('/review/:reviewId',validateCreateComment,createComment);

export default router;