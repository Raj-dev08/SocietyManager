import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
    {
        header:{
            type: String,
            required:true
        },
        description:{
            type: String,
            required: true
        },
        raisedBy:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        societyId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Societies"
        },
        image:{//one image for now can add more later
            type: String,
            default:""
        },
        fixedByAdmins:{//only admin can make it true 
            type:Boolean,
            default:false
        },
        verifiedByUser:{// only the one who raised it can make it true ensuring 2 factor verification
            type:Boolean,
            default:false
        },
        agreed:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        disagreed:[
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

const Complaints = mongoose.model("Complaints",complaintSchema)

export default Complaints