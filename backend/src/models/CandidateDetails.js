import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const candidateDetailsSchema = new mongoose.Schema(
  {
    // Personal Information (Section 1)
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    preferredLocation: { type: String, trim: true },
    willingToRelocate: { type: String, enum: ["Yes", "No", ""] },

    // Professional Details (Section 2)
    positionApplied: { type: String, trim: true },
    totalExperience: { type: String, trim: true },
    highestEducation: { type: String, trim: true },
    skills: [{ type: String }],
    noticePeriod: { type: String, trim: true },
    currentDesignation: { type: String, trim: true },
    currentCTC: { type: String, trim: true },

    // Experience Levels
    experienceLevels: {
      python: { type: String, enum: ["Beginner", "Intermediate", "Expert", "No Experience", ""], default: "" },
      rpa: { type: String, enum: ["Beginner", "Intermediate", "Expert", "No Experience", ""], default: "" },
      genai: { type: String, enum: ["Beginner", "Intermediate", "Expert", "No Experience", ""], default: "" },
    },

    // Document Links (Section 3) - Stored after Google Drive upload
    documents: {
      resume: { type: String, default: "" },
      idProof: { type: String, default: "" },
      photo: { type: String, default: "" },
      payslips: { type: String, default: "" },
      lastBreakup: { type: String, default: "" },
    },

    // Authentication
    password: { type: String, required: true },
    uniqueId: { type: String, unique: true },

    // Status
    registrationStatus: {
      type: String,
      enum: ["pending", "completed", "verified"],
      default: "completed",
    },
    isActive: { type: Boolean, default: true },

    // Exam related fields
    examStatus: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    examScore: { type: Number, default: null },
    examDate: { type: Date, default: null },
    timeTaken: { type: String, default: null },

    // Terms acceptance
    termsAccepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before saving and generate unique ID
candidateDetailsSchema.pre("save", async function () {
  // Generate unique ID if not present
  if (!this.uniqueId) {
    this.uniqueId = `CAND-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  
  // Hash password if modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Method to compare password
candidateDetailsSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("CandidateDetails", candidateDetailsSchema);
