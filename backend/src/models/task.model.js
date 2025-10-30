import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
    {
        societyId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Societies"
        },
        givenBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        taskName: {
            type: String,
            required: true
        },
        taskDetails: {
            type: String,
            required: true
        },
        deadLine: {
            type: Date,
            required: true
        },
        isDone:{
            type: Boolean,
            default: false
        },
        verifiedByOwner:{
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

taskSchema.index({ deadLine: -1 })

const Tasks = mongoose.model("Task", taskSchema)

export default Tasks