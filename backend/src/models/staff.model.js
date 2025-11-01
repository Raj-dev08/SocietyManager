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
    location: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], default: [0,0] } // [lng, lat]
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

// Before saving staff
staffSchema.pre("save", function(next) {
    this.location = {
        type: "Point",
        coordinates: [this.lng, this.lat]
    };
    next();
});

staffSchema.index({ location: "2dsphere" });


const Staffs = mongoose.model("Staff", staffSchema);
export default Staffs;
