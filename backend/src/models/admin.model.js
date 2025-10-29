import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
    {
        societyId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Societies"
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        tasks:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Task"
            }, 
        ],
        isActive:{
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
)

const Admins = mongoose.model("Admin",adminSchema)

export default Admins
