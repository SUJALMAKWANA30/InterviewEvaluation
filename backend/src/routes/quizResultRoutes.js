import express from "express";
import {
  createQuizResult,
  getAllQuizResults,
  getQuizResultById,
  getQuizResultByEmail,
} from "../controllers/quizResultController.js";

const router = express.Router();

router.post("/", createQuizResult);
router.get("/", getAllQuizResults);
router.get("/:id", getQuizResultById);
router.get("/email/:email", getQuizResultByEmail);

export default router;
