import mongoose from "mongoose";

const staffApplicationSchema = new mongoose.Schema(
    {
        societyId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Societies"
        },
        role:{
            type: String,
            required: true,
            enum: ["security","maintenance","cleaning"]
        },
        requirements: {
            type: String,
            required: true
        },
        approxPay: {
            type: String
        },
        applicants:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
    },
    {
        timestamps: true
    }
)

const StaffApplications = mongoose.model("StaffApplication", staffApplicationSchema)

export default StaffApplications;