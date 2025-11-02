import mongoose from "mongoose";

const workRequestSchema = new mongoose.Schema(
    {
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        societyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Societies"
        },
        requestedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending"
        },
        description: {
            type: String,
            required: true
        },
        isWorkDone: {
            type: Boolean,
            default: false
        },
        isWorkDoneVerifiedByUser:{
            type: Boolean,
            default: false
        },
        workDate: {
            type: Date,
            required: true
        },
        lat:{
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        },
        locationName: {
            type: String,
            required: true
        },
        distanceFromUser: {
            type: Number,
            default: 0
        },
        payment: {
            type: Number,
            required: true
        },
        reasonForRejection: {
            type: String,
            default: ""
        }     
    },{
        timestamps: true   
    }
)

workRequestSchema.index({distanceFromUser: 1})
const WorkRequest = mongoose.model("WorkRequest", workRequestSchema)

export default WorkRequest;