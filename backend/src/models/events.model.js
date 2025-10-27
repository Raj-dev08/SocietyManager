import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
        title:{
            type: String,
            required: true
        },
        description:{
            type: String,
            required: true
        },
        organisers:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        societyId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"Societies"
        },
        image:{
            type: String,
            default: ""
        },
        specialAttraction:{
            type: String
        },
        specialGuests:{
            type: String
        },
        dressCode:{
            type: String
        },
        date:{
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const Events = mongoose.model("Events",eventSchema)

export default Events;