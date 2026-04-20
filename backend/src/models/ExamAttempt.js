import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedOption: { type: Number, default: -1 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CandidateDetails",
      required: true,
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "submitted", "expired"],
      default: "active",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    lastHeartbeatAt: {
      type: Date,
      default: Date.now,
    },
    violationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    totalScore: {
      type: Number,
      default: null,
    },
    sectionWiseMarks: {
      type: [
        {
          sectionName: { type: String, required: true },
          marks: { type: Number, required: true },
          totalQuestions: { type: Number, required: true },
          correctAnswers: { type: Number, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

examAttemptSchema.index({ candidateId: 1, examId: 1, status: 1 });
examAttemptSchema.index({ candidateId: 1, createdAt: -1 });

export default mongoose.model("ExamAttempt", examAttemptSchema);
