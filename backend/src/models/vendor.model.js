import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    services: {
        type : String,
        required: true
    },
    about: {
      type: String,
      required: true
    },
    isAvailableForWork: {
      type: Boolean,
      default: true
    },
    payment:{ // approximate payment
        type: Number
    },
    workRequests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WorkRequest"
        }
    ],
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
    upVotedBy:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ],
    downVotedBy:[
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
    location: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], default: [0,0] } // [lng, lat]
    },
    locationName:{
        type:String,
        required:true
    },
  },
  { timestamps: true }
);

vendorSchema.pre("save", function(next) {
    this.location = {
        type: "Point",
        coordinates: [this.lng, this.lat]
    };
    next();
});

vendorSchema.index({ location: "2dsphere" });

const Vendors = mongoose.model("Vendor", vendorSchema);
export default Vendors;
