import cloudinary from "../lib/cloudinary.js";
import GroupChat from "../models/groupchat.model.js";
import { redis } from "../lib/redis.js";
import { io } from "../lib/socket.js";
import Societies from "../models/society.model.js";

export const sendMessages = async (req, res,next) => {
    try {
        const { user } = req;
        const groupId = req.params.id;
        const { text, image } = req.body;

        if(!groupId) {
            return res.status(400).json({ message: "Group ID is required" });
        }

        const group = await Societies.findById(groupId);

        if(!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if(!group.members.some(member => member.toString() === user._id.toString()) && 
            group.owner.toString() !== user._id.toString() && 
            !group.admins.some(admin => admin.toString() === user._id.toString())){
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        if ((!text ||text.trim()==="")&& !image) {
            return res.status(400).json({ message: "Text or image required" });
        }

        let imageUrl;
        if(image){
             try {
                const uploadedResponse = await cloudinary.uploader.upload(image);
                imageUrl = uploadedResponse.secure_url;
            } catch (cloudinaryError) {
                return res.status(500).json({ message: "Image upload failed", error: cloudinaryError.message });
            }
        }

        const message = new GroupChat({
            senderId: user._id,
            groupId,
            text,
            image: imageUrl,
        });
       
        await message.save();

        await message.populate("senderId", "name profilePic");


        io.to(groupId).emit("new_message", message);
        return res.status(201).json({ message: "Message sent successfully", message });  
    } catch (error) {
        next(error);
    }
}
export const getMessages = async (req, res,next) => {
    try {
        const { user } = req;
        const groupId = req.params.id;

        const limit = parseInt(req.query.limit) || 100;
        const before = req.query.before||Date.now() ;

        const cacheKey = `groupMessages:${groupId}:${limit}:${before}`;
        // const cachedKey2= `groupMessages:${groupId}:${limit}:${before} hasmore`;
        const cachedMessages = await redis.get(cacheKey);
        // const cachedHasMore = await redis.get(cachedKey2);

        const cacheJoinInfo=`user:${user._id.toString()},Joined groupId:${groupId}`;

        if (cachedMessages) {
            const parsedMessages = JSON.parse(cachedMessages);
            const {messages, hasMore} = parsedMessages;
            // const parsedHasMore = JSON.parse(cachedHasMore);
            return res.status(200).json({ messages, hasMore });
        }

        // console.log(user)


        if(!user) {
            return res.status(401).json({ message: "Unauthorized access" });
        }

        if(!groupId) {
            return res.status(400).json({ message: "Group ID is required" });
        }

        const group = await Societies.findById(groupId);

        if(!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if(!group.members.some(member => member.toString() === user._id.toString()) && 
            group.owner.toString() !== user._id.toString() && 
            !group.admins.some(admin => admin.toString() === user._id.toString())){
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        
        const query = {
            groupId,
        };

        if(before) {
            query.createdAt = { $lt: before };
        }

        const messages = await GroupChat.find(query)
                            .sort({ createdAt: -1 })
                            .limit(limit)
                            .populate("senderId", "name profilePic")
                            .populate("readBy", "name profilePic");
        const hasMore = messages.length === limit;

        messages.reverse(); // To return the oldest messages first

        const cachedJoinInfo = await redis.get(cacheJoinInfo);

        if(!cachedJoinInfo) {
            await GroupChat.updateMany(
                { groupId, readBy: { $nin: [user._id] } },
                { $addToSet: { readBy: user._id } }
            ); // to update all previous message as seen to have perfection
        }else{
             await GroupChat.updateMany(
            {
                _id: { $in: messages.map(m => m._id) },
                readBy: { $nin: [user._id] },
            },
            {
                $addToSet: { readBy: user._id }
            }
        );
        }
       
        const messagePayLoad={
            messages,
            hasMore
        }
        

        await redis.set(cacheKey, JSON.stringify(messagePayLoad), "EX", 60 * 60); // Cache for 1 hour

        await redis.set(cacheJoinInfo, "true","EX",30*24*60*60);//caching for 30 days after that time if the updatemany tries it wont find any if user saw it
        //can leave permanent

        res.status(200).json({ messages, hasMore });
    } catch (error) {
        next(error);
    }
}

export const getUnreadMessagesCount = async (req, res,next) => {
    try {
        const {user} = req;
        const groupId = req.params.id;

        if(!user) {
            return res.status(401).json({ message: "Unauthorized access" });
        }

        if(!groupId) {
            return res.status(400).json({ message: "Group ID is required" });
        }

        const group = await Societies.findById(groupId);

        if(!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if(!group.members.some(member => member.toString() === user._id.toString()) && 
            group.owner.toString() !== user._id.toString() && 
            !group.admins.some(admin => admin.toString() === user._id.toString())){
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        const unreadCount = await GroupChat.countDocuments({
            groupId,
            readBy: { $nin: [user._id] }
        });
        
        res.status(200).json({ unreadCount });
    } catch (error) {
        next(error);
    }
}

export const deleteMessage = async (req, res,next) => {
    try {
        const { user } = req;
        const messageId = req.params.id;

        if (!messageId) {
            return res.status(400).json({ message: "Message ID is required" });
        }

        const message = await GroupChat.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.senderId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }

        const now= new Date();

        if(now - message.createdAt > 15 * 60 * 1000) { // Check if the message is older than 15 minutes
            return res.status(403).json({ message: "You can only delete messages within 15 minutes" });
        }

        await GroupChat.deleteOne({ _id: messageId });

        io.to(message.groupId.toString()).emit("message_deleted", { messageId });

        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        next(error);
    }
}

export const editMessage = async (req, res,next) => {
    try {
        const { user } = req;
        const messageId = req.params.id;
        const { text, image } = req.body;

        if (!messageId) {
            return res.status(400).json({ message: "Message ID is required" });
        }

        const message = await GroupChat.findById(messageId)
                                        .populate("senderId", "name profilePic")
                                        .populate("readBy", "name profilePic");

        

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.senderId._id.toString() !== user._id.toString()) {
            return res.status(403).json({ message: "You can only edit your own messages" });
        }

        if (text) {
            message.text = text;
            message.isEdited = true;
        }

        if (image) {
            try {
                let imageUrl=null;
                if(image.trim()!==""){
                    const uploadedResponse = await cloudinary.uploader.upload(image);
                    imageUrl=uploadedResponse.secure_url
                } 
                message.image = imageUrl;
                message.isEdited = true;
            } catch (cloudinaryError) {
                return res.status(500).json({ message: "Image upload failed", error: cloudinaryError.message });
            }
        }
        await message.save();

        const keys = await redis.keys(`groupMessages:${message.groupId.toString()}:*`);
        if (keys.length > 0) {
            // console.log("done")
            // console.log(keys)
            await redis.del(...keys);
        }



        io.to(message.groupId.toString()).emit("message_edited", message);

        res.status(200).json({ message: "Message edited successfully", updatedMessage: message });
    } catch (error) {
        next(error);
    }
}