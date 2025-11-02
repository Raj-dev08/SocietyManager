import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    mobileNumber: {
        type: String,
        required: true
    },
    isMobileNumberVerified:{
        type: Boolean,
        default: false,
        required: true
    },
    description: {
        type: String,
    },
    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User" 
        }
    ],
    role:{
        type:String,
        required: true,
        default: "User",
        enum: ["Vendor", "Admin","User","Staff","Owner"]//can change the User to a userPreference model so u can actually have personalised ads
    },
    isSysAdmin:{
        type: Boolean,
        default: false
    },
    userType:{
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'role'
    },
    password: {
        type: String,
        required: true,
        minlength: 4,
    },
    profilePic: {
        type: String,
        default:""
    },
    societyId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Societies"
    },
    fcmToken:{
        type: String,
        required: true
    }
  },
  { timestamps: true }
);

userSchema.index({ name:"text" , description:"text", email:"text"})

const User = mongoose.model("User", userSchema);

export default User;