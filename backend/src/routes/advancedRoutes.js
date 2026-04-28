import express from "express";
import {
  getCommandPaletteItems,
  listSavedViews,
  createSavedView,
  updateSavedView,
  deleteSavedView,
  searchCandidates,
  getCandidateJourney,
  getCandidate360,
  createScorecardTemplate,
  listScorecardTemplates,
  evaluateCandidateScorecard,
  upsertDecision,
  listDecisions,
  enqueueNotification,
  getAsyncJobs,
  getCandidateFitScore,
  generateInterviewSummary,
} from "../controllers/advancedController.js";
import {
  authenticate,
  requireHRUser,
  authorizePermission,
} from "../middlewares/auth.js";
import { validateObjectId } from "../middlewares/validators.js";

const router = express.Router();

router.use(authenticate);

const hasPermission = (permissions = [], module, action) =>
  permissions.some((p) => p.module === module && Array.isArray(p.actions) && p.actions.includes(action));

const requireScorecardAccess = (action = "view") => (req, res, next) => {
  if (!req.user || req.user.type === "candidate") {
    return res.status(403).json({ success: false, message: "Insufficient permissions." });
  }

  if (req.user.level === 0) return next();

  const permissions = req.user.permissions || [];
  const allowedByScorecardModule = hasPermission(permissions, "scorecards", action);
  const allowedByR2RoundEdit = hasPermission(permissions, "round_r2", "edit");

  if (allowedByScorecardModule || allowedByR2RoundEdit) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Permission denied for scorecard access.",
  });
};

// Command palette and saved views (feature: command palette + saved filters)
router.get("/command-palette", requireHRUser, getCommandPaletteItems);
router.get("/saved-views", requireHRUser, listSavedViews);
router.post("/saved-views", requireHRUser, createSavedView);
router.put("/saved-views/:id", requireHRUser, validateObjectId("id"), updateSavedView);
router.delete("/saved-views/:id", requireHRUser, validateObjectId("id"), deleteSavedView);

// Search + candidate intelligence
router.get("/candidate-search", requireHRUser, searchCandidates);
router.get("/candidate-journey", requireHRUser, getCandidateJourney);
router.get("/candidate-journey/:candidateId", requireHRUser, validateObjectId("candidateId"), getCandidateJourney);
router.get("/candidate-360", requireHRUser, getCandidate360);
router.get("/candidate-360/:candidateId", requireHRUser, validateObjectId("candidateId"), getCandidate360);

// Scorecards + decision workflow
router.get("/scorecards/templates", requireHRUser, requireScorecardAccess("view"), listScorecardTemplates);
router.post("/scorecards/templates", requireHRUser, requireScorecardAccess("create"), createScorecardTemplate);
router.post("/scorecards/evaluate", requireHRUser, requireScorecardAccess("edit"), evaluateCandidateScorecard);

router.get("/decisions", requireHRUser, listDecisions);
router.post("/decisions", requireHRUser, upsertDecision);

// Async queue endpoints
router.post("/jobs/notify", requireHRUser, enqueueNotification);
router.get("/jobs", requireHRUser, getAsyncJobs);

// AI helper endpoints
router.post("/ai/fit-score", requireHRUser, getCandidateFitScore);
router.post("/ai/interview-summary", requireHRUser, generateInterviewSummary);

export default router;
