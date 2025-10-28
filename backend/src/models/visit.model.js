import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
    {
        visitor:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        visitFor:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        societyId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Societies"
        },
        date:{
            type: Date,
            required: true
        },
        status:{
            type: String,
            required: true,
            default: "pending",
            enum : ["accepted","pending","rejected"]
        }
    }
)

visitSchema.index({ date: -1 })

const Visit = mongoose.model("Visit",visitSchema)

export default Visit