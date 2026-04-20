import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userName: {
      type: String,
      default: "System",
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Auth
        "auth.login",
        "auth.logout",
        "auth.failed_login",
        // Candidates
        "candidate.view",
        "candidate.create",
        "candidate.update",
        "candidate.delete",
        // Rounds
        "round.update",
        "round.drop",
        "round.complete",
        // Exams
        "exam.create",
        "exam.update",
        "exam.delete",
        "exam.activate",
        // Drives
        "drive.create",
        "drive.update",
        "drive.delete",
        "drive.toggle",
        // Roles & Users
        "role.create",
        "role.update",
        "role.delete",
        "user.create",
        "user.update",
        "user.delete",
        "user.toggle_status",
        // Data
        "data.export",
        // General
        "settings.update",
      ],
    },
    targetType: {
      type: String,
      default: null,
      // e.g., 'CandidateDetails', 'Exam', 'Drive', 'User', 'Role'
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // { before: {...}, after: {...} }
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model("AuditLog", auditLogSchema);
