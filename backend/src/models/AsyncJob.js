import mongoose from "mongoose";

const asyncJobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["email", "reminder", "report", "analytics", "general"],
      default: "general",
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },
    availableAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

asyncJobSchema.index({ status: 1, availableAt: 1, createdAt: 1 });

export default mongoose.model("AsyncJob", asyncJobSchema);
