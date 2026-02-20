import mongoose from "mongoose";

const userTimeDetailsSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true, unique: true },
    phone: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    photo: { type: String, default: "" },
    passwordHash: { type: String, default: "" },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    completionTime: { type: Number, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("UserTimeDetails", userTimeDetailsSchema);
