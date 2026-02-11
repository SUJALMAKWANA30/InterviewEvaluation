import express from "express";
import { loginUser } from "../controllers/authController.js";

const router = express.Router();

router.post("/login-user", loginUser);

export default router;
