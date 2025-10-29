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
        }
    },
    {
        timestamps: true
    }
);

const Tasks = mongoose.model("Task", taskSchema)

export default Tasks