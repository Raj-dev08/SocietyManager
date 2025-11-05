import mongoose from "mongoose";

const groupChatSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        groupId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Societies",
            required: true,
        },
        text: {
            type: String,
        },
        image: {
            type: String,
        },
        isEdited:{
            type: Boolean,
            default: false,
        },
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    { timestamps: true }
);

groupChatSchema.index({ groupId:1 ,createdAt: -1 });
groupChatSchema.index({groupId:1,readBy:1});

const GroupChat = mongoose.model("GroupChat", groupChatSchema);
export default GroupChat;