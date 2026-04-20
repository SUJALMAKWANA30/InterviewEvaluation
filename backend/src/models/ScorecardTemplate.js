import mongoose from "mongoose";

const scorecardCriteriaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const scorecardTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    roleName: { type: String, default: "", trim: true },
    driveId: { type: mongoose.Schema.Types.ObjectId, ref: "Drive", default: null },
    round: {
      type: String,
      enum: ["R2", "R3", "R4"],
      required: true,
    },
    criteria: {
      type: [scorecardCriteriaSchema],
      default: [],
      validate: (arr) => Array.isArray(arr) && arr.length > 0,
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

scorecardTemplateSchema.index({ round: 1, isActive: 1 });
scorecardTemplateSchema.index({ driveId: 1, round: 1, roleName: 1 });

export default mongoose.model("ScorecardTemplate", scorecardTemplateSchema);
