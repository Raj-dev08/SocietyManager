import Message from "../models/message.model.js";
import { redis } from "../lib/redis.js";
import { io ,getReceiverSocketId } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";

export const sendMessage = async (req, res, next) => {
  try {
    const { user } = req;
    const { text, image } = req.body;
    const receiverId = req.params.id;

    let imageUrl;


    if (!receiverId || (!text && !image)) {
      return res.status(400).json({ message: "Recipient and text or image required" });
    }

    if (image) {
      const uploadedResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadedResponse.secure_url;
    }

    const message = new Message({
      senderId: user._id,
      receiverId,
      text,
      image: imageUrl,
    });

    await message.save();

    // Emit the message to the receiver's socket
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("new_message", message);
    }

    return res.status(201).json({ message: "Message sent successfully", message });
  } catch (error) {
    next(error);
  }
}

export const getMessages = async (req, res, next) => {
    try {
        const { user } = req;
        const receiverId = req.params.id;
        const limit = parseInt(req.query.limit) || 100;
        const before = req.query.before;

        const cacheKey = `messages:${user._id}:${receiverId}:${limit}:${before}`;
        const cachedMessages = await redis.get(cacheKey);

        if (cachedMessages) {
            const parsedMessages = JSON.parse(cachedMessages);
            const { messages, hasMore } = parsedMessages;
            return res.status(200).json({ messages, hasMore });
        }

        const query = {
            $or: [
                { senderId: user._id, receiverId },
                { senderId: receiverId, receiverId: user._id }
            ]
        };

        if (before) {
            query.createdAt = { $lt: before };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)

        messages.reverse(); // To return the oldest messages first

        await Message.updateMany(
            { receiverId: user._id, senderId: receiverId, isSeen: false },
            { $set: { isSeen: true } }
        );

        const hasMore = messages.length === limit;

        const cacheData = {
            messages,
            hasMore
        };

        await redis.set(cacheKey, JSON.stringify(cacheData), "EX", 60 * 60); // Cache for 1 hour

        return res.status(200).json({ messages, hasMore });
    } catch (error) {
        next(error);
    }
}

export const deleteMessage = async (req, res, next) => {
  try {
    const { user } = req;
    const messageId = req.params.id;

    if (!messageId){
        return res.status(400).json({ message: "Message ID is required" });
    }
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    if(message.createdAt.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      return res.status(403).json({ message: "You can only delete messages within 24 hours" });
    }

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
        io.to(receiverSocketId).emit("message_deleted", message._id);
    }

    await Message.deleteOne({ _id: messageId });
    

    return res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export const editMessage = async (req, res, next) => {
    try {
        const { user } = req;
        const messageId = req.params.id;
        const { text, image } = req.body;

        if (!messageId) {
            return res.status(400).json({ message: "Message ID is required" });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.senderId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: "You can only edit your own messages" });
        }

        if (message.createdAt.getTime() < Date.now() - 15 * 60 * 1000) { // Check if the message is older than 15 minutes
            return res.status(403).json({ message: "You can only edit messages within 15 minutes" });
        }

        if( !text && !image) {
            return res.status(400).json({ message: "Text or image is required to edit the message" });
        }


        if ( text ){
            message.text = text;
        }
        
        

        if(image && image.trim()) {
            const uploadedResponse = await cloudinary.uploader.upload(image);
            message.image = uploadedResponse.secure_url;
        }

        message.isEdited = true;
        await message.save();


        const receiverSocketId = getReceiverSocketId(message.receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("message_edited", message);
        }

        return res.status(200).json({ message: "Message edited successfully", message });
    } catch (error) {
        next(error);
    }
}

export const getUnreadMessagesCount = async (req, res, next) => {
    try {
        const { user } = req;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized access" });
        }

        const unreadCount = await Message.countDocuments({
            receiverId: user._id,
            isSeen: false
        });

        return res.status(200).json({ unreadCount });
    } catch (error) {
        next(error);
    }
}