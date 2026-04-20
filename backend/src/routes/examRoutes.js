import express from "express";
import {
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  deleteExam,
  toggleActiveExam,
  getActiveExam,
  autosaveExamAttempt,
  getMyActiveAttempt,
} from "../controllers/examController.js";
import { authenticate, authorizePermission, requireCandidateUser } from "../middlewares/auth.js";
import { requireCandidateLocationAccess } from "../middlewares/locationAccess.js";
import { validateExam, validateObjectId } from "../middlewares/validators.js";

const router = express.Router();

// Public route - get active exam (for user-side quiz)
router.get("/active", authenticate, requireCandidateLocationAccess, getActiveExam);
router.get(
  "/attempts/active",
  authenticate,
  requireCandidateUser,
  requireCandidateLocationAccess,
  getMyActiveAttempt
);
router.post(
  "/attempts/:id/autosave",
  authenticate,
  requireCandidateUser,
  requireCandidateLocationAccess,
  validateObjectId("id"),
  autosaveExamAttempt
);

// Protected HR routes
router.get("/", authenticate, getAllExams);
router.get("/:id", authenticate, validateObjectId("id"), getExamById);
router.post("/", authenticate, authorizePermission("exams", "create"), validateExam, createExam);
router.put("/:id", authenticate, authorizePermission("exams", "edit"), validateObjectId("id"), updateExam);
router.delete("/:id", authenticate, authorizePermission("exams", "delete"), validateObjectId("id"), deleteExam);
router.patch("/:id/toggle-active", authenticate, authorizePermission("exams", "edit"), validateObjectId("id"), toggleActiveExam);

export default router;
