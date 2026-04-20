import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    permissions: [
      {
        module: {
          type: String,
          enum: [
            "candidates",
            "exams",
            "drives",
            "round_r2",
            "round_r3",
            "round_r4",
            "reports",
            "settings",
            "users",
            "rounds",
            "audit_logs",
            "ai",
            "search",
            "scorecards",
            "decisions",
          ],
        },
        actions: [
          {
            type: String,
            enum: ["view", "create", "edit", "delete", "export", "assign"],
          },
        ],
      },
    ],
    level: {
      type: Number,
      default: 1,
      // 0 = Super Admin (system), 1 = Admin, 2 = Manager, 3 = Recruiter, 4 = Executive
    },
    isSystem: {
      type: Boolean,
      default: false,
      // System roles (Super Admin) cannot be deleted
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Create slug from name before saving
roleSchema.pre("save", function () {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
});

export default mongoose.model("Role", roleSchema);
