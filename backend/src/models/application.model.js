import mongoose from "mongoose";

const applicantSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    appliedFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Societies",
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date
    }
  },
  {
    timestamps: true 
  }
);

const Application = mongoose.model("Application", applicantSchema);

export default Application;
