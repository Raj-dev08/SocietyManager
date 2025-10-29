import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Societies",
      required: true
    },
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"
      }
    ],
    isAvailableForWork: {
      type: Boolean,
      default: true
    },
    roleDescription: {
      type: String // e.g., “security”, “maintenance”, “cleaning” that is only associated with one society
    },
    lat:{ // looking in map so admin or owner can hire them 
        type:Number,
        required:true
    },
    lng:{
        type:Number,
        required:true
    },
    locationName:{
        type:String,
        required:true
    },
  },
  { timestamps: true }
);

const Staffs = mongoose.model("Staff", staffSchema);
export default Staffs;
