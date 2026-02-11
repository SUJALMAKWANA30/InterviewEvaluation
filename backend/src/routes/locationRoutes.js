import express from "express";
import { validateLocationToken } from "../controllers/locationController.js";

const router = express.Router();

router.get("/validate", validateLocationToken);

export default router;
