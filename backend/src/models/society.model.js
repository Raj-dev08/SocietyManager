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
        location: {
            type: { type: String, default: "Point" },
            coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
        },
        locationName:{//can use as cityname through frontend
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
        flat:{
            houseNo:{
                type: String,
                required: true
            },
            houseMembers:[
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
        },
        admins:[// all the society admins
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        scheduledVisit:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Visit"
            }
        ],
        staff:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
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


societySchema.pre("save", function(next) {
    this.location = { type: "Point", coordinates: [this.lng, this.lat] };
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


societySchema.index({ location: "2dsphere" });


const Societies = mongoose.model("Societies", societySchema)

export default Societies;