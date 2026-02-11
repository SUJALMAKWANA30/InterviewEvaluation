import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  uniqueId: { type: String, unique: true },
  userType: { type: String, enum: ["user", "hr"], default: "user" }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
