import express from "express";
import {
  getAllCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
} from "../controllers/candidateController.js";

const router = express.Router();

router.get("/", getAllCandidates);
router.get("/:id", getCandidateById);
router.post("/", createCandidate);
router.put("/:id", updateCandidate);

export default router;
