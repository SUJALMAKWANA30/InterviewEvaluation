import express from "express";
import {
  createQuizResult,
  getAllQuizResults,
  getQuizResultById,
  getQuizResultByEmail,
  updateQuizResultByEmail,
  submitQuizAttempt,
} from "../controllers/quizResultController.js";
import {
  authenticate,
  authorizeLevel,
  requireHRUser,
  requireCandidateUser,
} from "../middlewares/auth.js";
import { requireCandidateLocationAccess } from "../middlewares/locationAccess.js";

const router = express.Router();

router.post("/", authenticate, requireCandidateUser, requireCandidateLocationAccess, createQuizResult);
router.post("/submit", authenticate, requireCandidateUser, requireCandidateLocationAccess, submitQuizAttempt);
router.get("/", authenticate, requireHRUser, getAllQuizResults);
router.put("/email/:email", authenticate, authorizeLevel(4), updateQuizResultByEmail);
router.get("/email/:email", authenticate, requireCandidateLocationAccess, getQuizResultByEmail);
router.get("/:id", authenticate, requireHRUser, getQuizResultById);

export default router;
