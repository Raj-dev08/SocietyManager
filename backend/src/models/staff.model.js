import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Societies",
    },//no task for now cuz staff roles are manual mostly 
    isAvailableForWork: {
      type: Boolean,
      default: true
    },
    about:{
      type: String,
      required: true
    },
    roleDescription: {
      type: String ,// e.g., “security”, “maintenance”, “cleaning” that is only associated with one society
      required: true,
      enum: ["security","maintenance","cleaning"]
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
    resume:{
      type: String,
      default: ""
    },
    workingHours:{
      from:{
            type: String,
            required: true
        },
      to:{
          type: String,
          required: true
      }
    }
  },
  { timestamps: true }
);

//no need of geonear cuz we dont find staff


const Staffs = mongoose.model("Staff", staffSchema);
export default Staffs;
