import express from "express";
import {
  loginHR,
  refreshToken,
  getHRProfile,
  logoutHR,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/auth.js";
import { validateHRLogin } from "../middlewares/validators.js";

const router = express.Router();

// Public routes
router.post("/login", validateHRLogin, loginHR);
router.post("/refresh-token", refreshToken);

// Protected routes
router.get("/profile", authenticate, getHRProfile);
router.post("/logout", authenticate, logoutHR);

export default router;
