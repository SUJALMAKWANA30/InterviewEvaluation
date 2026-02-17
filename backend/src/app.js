import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import rateLimiter from "./middlewares/rateLimiter.js";

import candidateDetailsRoutes from "./routes/candidateDetailsRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";

import { loadLocationTokens } from "./utils/locationTokens.js";

dotenv.config();

const app = express();

connectDB();
loadLocationTokens();

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(rateLimiter);
app.use(cors());

app.use("/api/candidate-details", candidateDetailsRoutes);
app.use("/api/location", locationRoutes);

export default app;
