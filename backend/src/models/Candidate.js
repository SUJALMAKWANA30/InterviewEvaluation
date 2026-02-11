import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  score: Number,
  examStatus: String,
  timeTaken: String
}, { timestamps: true });

export default mongoose.model("Candidate", candidateSchema);
