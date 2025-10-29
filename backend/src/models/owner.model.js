import mongoose from "mongoose";

const ownerSchema = new mongoose.Schema(
  {
    societyId:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Societies",
        }
    ],
    userId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Owners = mongoose.model("Owner", ownerSchema);
export default Owners;
