import mongoose from "mongoose";

const quizResultSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
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
    examDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("QuizResult", quizResultSchema);
