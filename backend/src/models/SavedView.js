import mongoose from "mongoose";

const savedViewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      enum: ["candidates", "reports", "drives", "exams", "audit"],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sorting: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    columns: {
      type: [String],
      default: [],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

savedViewSchema.index({ userId: 1, module: 1, name: 1 }, { unique: true });

export default mongoose.model("SavedView", savedViewSchema);
