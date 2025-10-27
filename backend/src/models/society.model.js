import mongoose from 'mongoose'

const societySchema = new mongoose.Schema(
    {
        name:{
            type:String,
            required:true
        },
        description:{
            type:String
        },
        owner:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        images: {
            type: [String], 
            default: [""]    
        },
        lat:{
            type:Number,
            required:true
        },
        lng:{
            type:Number,
            required:true
        },
        locationName:{
            type:String,
            required:true
        },
        landMark:{
            type:String
        },
        members:[//society members
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        events:[//society events like festivals or others
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Events"
            }
        ],
        complaints:[//complaints like need of maintanence
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Complaints"
            }
        ],
        notices:[//notices issues by the society admin
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Notices"
            }
        ],
        admins:[// all the society admins
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        bills: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Bills"
            }
        ],
        memberCount:{
            type: Number,
            default: 0
        },
        eventCount:{
            type: Number,
            default: 0
        },
        adminCount:{
            type: Number,
            default: 0
        },
    },
    {
        timestamps: true
    }
)

societySchema.pre("save", function(next) {
  this.memberCount = this.members.length;
  this.eventCount = this.events.length;
  this.adminCount = this.admins.length;
  next();
});



//index for searching
societySchema.index({
    name: "text",
    description: "text",
    locationName: "text",
    landMark: "text"
})

societySchema.index({createdAt:-1});
societySchema.index({createdAt:1});

societySchema.index({memberCount:-1});
societySchema.index({memberCount:1});

societySchema.index({eventCount:-1});
societySchema.index({eventCount:1});

societySchema.index({adminCount:-1});
societySchema.index({adminCount:1});


const Societies = mongoose.model("Societies", societySchema)

export default Societies;