import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    societyId: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Societies",
            required: true
        }
    ],
    services: [
      {
        type: String // e.g., “grocery”, “plumber”, “electrician”
      }
    ],
    isAvailableForWork: {
      type: Boolean,
      default: true
    },
    payment:{ // approximate payment
        type: Number
    },
    workHours:{
        from:{
            type: String,
            required: true
        },
        to:{
            type: String,
            required: true
        }
    },
    ratings: { // calculate by ( upvote / upvote + downvote ) * 10 * 1/2 getting 0-5
      type: Number,
      default: 0
    },
    upVotedBy:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ],
    downoVotedBy:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ],
    lat:{ // for looking in map so users can hire them
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

const Vendors = mongoose.model("Vendor", vendorSchema);
export default Vendors;
