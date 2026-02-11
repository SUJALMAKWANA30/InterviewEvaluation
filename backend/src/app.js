import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";

import authRoutes from "./routes/authRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import examRoutes from "./routes/examRoutes.js";

import { loadLocationTokens } from "./utils/locationTokens.js";

dotenv.config();

const app = express();

connectDB();
loadLocationTokens();

app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(rateLimiter);
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/exam", examRoutes);

export default app;
