import mongoose from "mongoose";

const decisionHistorySchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    stage: {
      type: String,
      enum: ["interviewer", "manager", "admin", "final"],
      default: "interviewer",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "hold"],
      default: "pending",
    },
    reasonCode: { type: String, default: "" },
    reasonNote: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const decisionSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CandidateDetails",
      required: true,
      index: true,
    },
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      default: null,
      index: true,
    },
    stage: {
      type: String,
      enum: ["interviewer", "manager", "admin", "final"],
      default: "interviewer",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "hold"],
      default: "pending",
      index: true,
    },
    reasonCode: { type: String, default: "" },
    reasonNote: { type: String, default: "" },
    recommendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    history: { type: [decisionHistorySchema], default: [] },
  },
  { timestamps: true }
);

decisionSchema.index({ candidateId: 1, createdAt: -1 });

decisionSchema.pre("save", function () {
  if (!Array.isArray(this.history)) {
    this.history = [];
  }
});

export default mongoose.model("Decision", decisionSchema);
