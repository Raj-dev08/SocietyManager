import FriendRequest from "../models/friendrequest.model.js";
import User from "../models/user.model.js";
import { redis } from "../lib/redis.js";
import { sendNotificationToFCM } from "../lib/fcm.js";
import Message from "../models/message.model.js";

export const searchUser = async (req, res, next) => {
  try {
    const { user } = req;
    const { search } = req.query;

    let searchCondition = {};
    let sort = {};

    if (search) {
      if (search.length > 6) {
        searchCondition = { $text: { $search: search } };
        sort = { score: { $meta: "textScore" } };
      } else {
        searchCondition = {
          $or: [
            { name: { $regex: search || "", $options: "i" } },
            { email: { $regex: search || "", $options: "i" } },
            { description: { $regex: search || "", $options: "i" } },
          ],
        };
      }
    }

    const profiles = await User.find({
      ...searchCondition,
      _id: { $ne: user._id },
    })
      .sort(sort)
      .limit(50)
      .select("name email profilePic description")
      .lean();

    return res.status(200).json({ profiles });
  } catch (error) {
    next(error);
  }
};

export const sendFriendRequest = async (req, res, next) => {
  try {
    const { user } = req;
    const { userId } = req.params;

    if (!userId) return res.status(400).json({ message: "User ID required" });
    if (userId === user._id.toString())
      return res.status(400).json({ message: "Cannot send request to yourself" });

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (user.friends?.some(id => id.toString() === userId)) return res.status(400).json({ message: "Already friends" });

    const existing = await FriendRequest.findOne({
      $or: [
        { sender: user._id, receiver: userId },
        { sender: userId, receiver: user._id },
      ],
    });

    if (existing) return res.status(400).json({ message: "Friend request already exists" });

    const newRequest = new FriendRequest({
      sender: user._id,
      receiver: userId,
      status: "pending",
    });

    await newRequest.save();

    if (targetUser.fcmToken){
        const message = `${user.name} sent you a friend request`
        await sendNotificationToFCM(targetUser.fcmToken,{
            title:"New friend request received",
            body:message
        })
    }

    return res.status(200).json({ message: "Friend request sent" });
  } catch (error) {
    next(error);
  }
};


export const getAllFriendRequestToMe = async (req, res, next) => {
  try {
    const { user } = req;

    const cacheKey = `FriendReq_To:${user._id}`
    const cached = await redis.get(cacheKey)
    if(cached){
        return res.status(200).json({ friendRequests: JSON.parse(cached)})
    }

    const requests = await FriendRequest.find({
      receiver: user._id,
      status: "pending",
    })
      .populate("sender", "name email profilePic")
      .lean();

    if (!requests.length)
      return res.status(200).json({ message: "No pending friend requests" });

    await redis.set(
      cacheKey,
      JSON.stringify(requests),
      "EX",
      60 * 60 * 24
    );

    return res.status(200).json({ friendRequests: requests });
  } catch (error) {
    next(error);
  }
};


export const getAllFriendRequestFromMe = async (req, res, next) => {
  try {
    const { user } = req;

    const cacheKey = `FriendReq_From:${user._id}`
    const cached = await redis.get(cacheKey)
    if(cached){
        return res.status(200).json({ friendRequests: JSON.parse(cached)})
    }

    const requests = await FriendRequest.find({
      sender: user._id,
      status: "pending",
    })
      .populate("receiver", "name email profilePic")
      .lean();

    if (!requests.length)
      return res.status(200).json({ message: "No outgoing friend requests" });

    await redis.set(
      cacheKey,
      JSON.stringify(requests),
      "EX",
      60 * 60 * 24
    );

    return res.status(200).json({ friendRequests: requests });
  } catch (error) {
    next(error);
  }
};


export const acceptFriendRequest = async (req, res, next) => {
  try {
    const { user } = req;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId).populate("sender");
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.receiver.toString() !== user._id.toString()){
        return res.status(403).json({ message: "Not authorized" });
    }
      

    if (request.status !== "pending"){
        return res.status(400).json({ message: "Request already processed" });
    }
      
    const sender= request.sender;

    if(!sender) return res.status(404).json({ message: "Sender not found" });

    if(!user.friends.some(id => id.toString() === sender._id.toString())) {
        user.friends.push(sender._id);
    }

    if(!sender.friends.some(id => id.toString() === user._id.toString())) {
        sender.friends.push(user._id);
    }

    request.status = "accepted";
    await request.save();
    await user.save();
    await sender.save();

    await redis.del(`FriendReq_To:${user._id}`);
    await redis.del(`FriendReq_From:${sender._id}`);

    await redis.del(`friends:${user._id}`);
    await redis.del(`friends:${sender._id}`);



    if (sender.fcmToken){
        const message = `${user.name} accepted your friend request`
        await sendNotificationToFCM(sender.fcmToken,{
            title:"Friend request accepted",
            body:message
        })
    }

    return res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    next(error);
  }
};


export const rejectFriendRequest = async (req, res, next) => {
  try {
    const { user } = req;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.receiver.toString() !== user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    request.status = "rejected";
    await request.save();

    await redis.del(`FriendReq_To:${user._id}`);
    await redis.del(`FriendReq_From:${request.sender}`);

    return res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    next(error);
  }
};


export const cancelFriendRequest = async (req, res, next) => {
  try {
    const { user } = req;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.sender.toString() !== user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    await FriendRequest.findByIdAndDelete(requestId);

    await redis.del(`FriendReq_From:${user._id}`);
    await redis.del(`FriendReq_To:${request.receiver}`);

    return res.status(200).json({ message: "Friend request cancelled" });
  } catch (error) {
    next(error);
  }
};


export const getAllFriends = async (req, res, next) => {
  try {
    const { user } = req;

    const cacheData = await redis.get(`friends:${user._id}`);
    const cachedFriends = cacheData ? JSON.parse(cacheData) : null;

    let userUnseenMap={};

    if (cachedFriends) {
        const unreadCounts = await Promise.all(
          cachedFriends.map(async (friend) => {
              const unreadCount = await Message.countDocuments({
                  receiverId: user._id,
                  senderId: friend._id,
                  isSeen: false,
              });

              return { id: friend._id, unreadCount };
              })
        );

        unreadCounts.forEach((uc)=>{
            userUnseenMap[uc.id]=uc.unreadCount;
        })
        return res.status(200).json({friends: cachedFriends,unreadCounts:userUnseenMap});
    }

    const userAcc= await User.findById(user._id).populate("friends", "name profilePic email description friends projects");

    if(userAcc.friends.length === 0) {
        return res.status(404).json({message: "No friends found"});
    }

    const unreadCounts = await Promise.all(
        userAcc.friends.map(async (friend) => {
            const unreadCount = await Message.countDocuments({
                receiverId: user._id,
                senderId: friend._id,
                isSeen: false,
            });

            return { id: friend._id, unreadCount };
            })
        );

    unreadCounts.forEach((uc)=>{
        userUnseenMap[uc.id]=uc.unreadCount;
    })

    await redis.set(`friends:${user._id}`, JSON.stringify(userAcc.friends),"EX", 60 * 60 ); // Cache for 1 hour


     return res.status(200).json({ friends:userAcc.friends, unreadCounts:userUnseenMap });
  } catch (error) {
    next(error);
  }
};
