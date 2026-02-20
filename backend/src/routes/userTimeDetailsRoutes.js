import express from "express";
import {
  registerUserTimeDetails,
  getByEmail,
  startExam,
  endExam,
  completeExam,
} from "../controllers/userTimeDetailsController.js";

const router = express.Router();

router.post("/register", registerUserTimeDetails);
router.get("/email/:email", getByEmail);
router.post("/start", startExam);
router.post("/end", endExam);
router.post("/complete", completeExam);

export default router;
