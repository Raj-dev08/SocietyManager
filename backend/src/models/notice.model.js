import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
    {
        header: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true//can have enum later for controlled types
        },
        societyId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Societies"
        },
        inconvenience: {
            type:String
        },
        fromDate: {
            type: Date
        },
        toDate: {
            type: Date
        },
        reason: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

const Notices = mongoose.model("Notices", noticeSchema )

export default Notices;