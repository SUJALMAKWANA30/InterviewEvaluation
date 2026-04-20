import mongoose from "mongoose";

const roundReviewSchema = new mongoose.Schema(
  {
    rating: { type: String, default: "" },
    comments: { type: String, default: "" },
    interviewer: { type: String, default: "" },
    status: {
      type: String,
      enum: ["", "in progress", "completed", "drop", "rejected"],
      default: "",
    },
    managerialStatus: {
      type: String,
      enum: ["", "GO", "HOLD", "NO GO"],
      default: "",
    },
  },
  { _id: false }
);

const scorecardEvaluationSchema = new mongoose.Schema(
  {
    round: {
      type: String,
      enum: ["R2", "R3", "R4"],
      default: "R2",
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScorecardTemplate",
      default: null,
    },
    templateName: { type: String, default: "" },
    interviewer: { type: String, default: "" },
    criteriaScores: [
      {
        key: { type: String, default: "" },
        label: { type: String, default: "" },
        score: { type: Number, default: 0 },
        maxScore: { type: Number, default: 10 },
        weight: { type: Number, default: 1 },
      },
    ],
    normalizedScore: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const quizResultSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    mobileNumber: { type: String },
    name: { type: String },
    sectionWiseMarks: [
      {
        sectionName: { type: String, required: true },
        marks: { type: Number, required: true },
        totalQuestions: { type: Number, required: true },
        correctAnswers: { type: Number, required: true },
      },
    ],
    totalMarks: { type: Number, required: true },
    R2: { type: [roundReviewSchema], default: [] },
    R3: { type: [roundReviewSchema], default: [] },
    R4: { type: [roundReviewSchema], default: [] },
    scorecards: { type: [scorecardEvaluationSchema], default: [] },
    reasonTags: { type: [String], default: [] },
    examDate: { type: Date, default: Date.now },
    driveId: { type: mongoose.Schema.Types.ObjectId, ref: "Drive", default: null },
  },
  { timestamps: true }
);

quizResultSchema.index({ email: 1 });
quizResultSchema.index({ driveId: 1, createdAt: -1 });

export default mongoose.model("QuizResult", quizResultSchema);
