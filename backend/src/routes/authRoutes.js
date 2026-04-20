import express from "express";
import {
  loginHR,
  refreshToken,
  getHRProfile,
  logoutHR,
  getMySessions,
  revokeSession,
  setupMFA,
  enableMFA,
  disableMFA,
  getMFAStatus,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/auth.js";
import { validateHRLogin, validateObjectId } from "../middlewares/validators.js";

const router = express.Router();

// Public routes
router.post("/login", validateHRLogin, loginHR);
router.post("/refresh-token", refreshToken);

// Protected routes
router.get("/profile", authenticate, getHRProfile);
router.post("/logout", authenticate, logoutHR);
router.get("/sessions", authenticate, getMySessions);
router.delete("/sessions/:id", authenticate, validateObjectId("id"), revokeSession);

router.get("/mfa/status", authenticate, getMFAStatus);
router.post("/mfa/setup", authenticate, setupMFA);
router.post("/mfa/enable", authenticate, enableMFA);
router.post("/mfa/disable", authenticate, disableMFA);

export default router;
