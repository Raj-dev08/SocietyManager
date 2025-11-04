import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
    {
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        image:{
            type: [String],
            default: [""]
        },
        price:{
            type: Number,
            required: true
        },
        category:{
            type: String,
            required: true
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
            coordinates: { type: [Number], default: [0, 0] }
        },
        locationName:{
            type:String,
            required:true
        },
        landMark:{
            type:String
        },
        sold: {
            type: Boolean,
            default: false
        },
    },{
        timestamps: true
    }
)

itemSchema.pre("save", function(next) {
    this.location = { type: "Point", coordinates: [this.lng, this.lat] };
    next();
})

itemSchema.index({ name: "$text" , description: "$text", locationName: "$text", landMark: "$text"})
itemSchema.index({ location: "2dsphere" });

itemSchema.index({ createdAt: -1 });
itemSchema.index({ createdAt: 1 });

itemSchema.index({ price: 1 });
itemSchema.index({ price: -1 });

const Items = mongoose.model("Items", itemSchema)

export default Items;