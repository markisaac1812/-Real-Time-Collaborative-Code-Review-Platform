import { Router } from "express";
import { createReview } from "../controllers/reviewController";
import { protect,restrictedTo } from "../controllers/authController";

const router = Router();

router.use(protect);

// create review for a certain submissoin
router.post("/reviews/:submissionId", createReview);


