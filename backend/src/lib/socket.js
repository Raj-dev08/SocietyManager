import { Server } from "socket.io";
import http from "http";
import express from "express";
// import GroupChat from "../models/groupchat.model.js";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

function getUserRoomId(user1, user2) {
  return `user:${[user1, user2].sort().join(":")}`;
}

//to get socket with user
const userSocketMap = {}; // object of userIds:socketId

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;


  io.emit("getOnlineUsers", Object.keys(userSocketMap));


//   socket.on("joinGroup", (groupId) => {
//     socket.join(groupId);
//     console.log(`User ${userId} joined group ${groupId}`);
//   }); 

//   socket.on("joinedGroupNotification",(groupId)=>{
//     socket.join(`notification:${groupId}`)
//     console.log(`User ${userId} joined group notification:${groupId}`);
//   })

  socket.on("joinUserMessageRoom",(to,from)=>{
    const roomId = getUserRoomId(to, from);
    socket.join(roomId);
    console.log(`User ${from} joined ${roomId}`);
  })

  socket.on("leaveUserMessageRoom",(to,from)=>{
    const roomId=getUserRoomId(to,from);
    socket.leave(roomId);
    console.log(`User ${from} left ${roomId}`);
  });

  //group chat typing
  socket.on("typing",({from,to})=>{
    socket.to(to).emit("userTyping",{from})
  })

  socket.on("stopTyping",({from,to})=>{
    socket.to(to).emit("userStoppedTyping",{from})
  })


  //user 1 on 1 message typing
  socket.on("typingToUser",({from,to})=>{
    const receiverSocketId = getReceiverSocketId(to); 
    socket.to(receiverSocketId).emit("userTypingToUser",{from})
  })
  
  socket.on("stopTypingToUser",({to})=>{ 
    const receiverSocketId = getReceiverSocketId(to);
    socket.to(receiverSocketId).emit("userStoppedTypingToUser")
  })

  //no need to leave the gc room cus it needs id to push which isnt sent from frontend
//   socket.on("message_seen",async({message,id})=>{
//    const updatedMessage = await GroupChat.findByIdAndUpdate(
//       message._id,
//       { $addToSet: { readBy: id } },
//       { new: true }
//     ).populate("readBy", "name profilePic").populate("senderId","name profilePic");

//     socket.to(message.groupId).emit("message_seen_byUser",{message:updatedMessage})
//   })


  //user message seen
  socket.on("message_seen", async({message})=>{
    
    const receiverId = message.receiverId;
    const senderId = message.senderId;
    
    const roomSocket = getUserRoomId(receiverId, senderId);

    const roomSockets = io.sockets.adapter.rooms.get(roomSocket);
    

    const receiverSocketId = getReceiverSocketId(receiverId);
    
    //ensuring there is a receiver socket and they are in the room
    if (!receiverSocketId || !roomSockets || !roomSockets.has(receiverSocketId) || roomSockets.size === 0) {
      console.log("Receiver not in room, skipping seen emit");
      return;
    }


    const updatedMessage = await Message.findByIdAndUpdate(
      message._id,
      { isSeen: true },
      { new: true }
    );

    console.log("roomSocket", roomSocket);
    
    socket.to(roomSocket).emit("message_seen_byUser",{message:updatedMessage})
  })

  socket.on("message_notification",({groupId,msg})=>{
    const socketRoom=`notification:${groupId}`
    socket.to(socketRoom).emit("new_message_notification",msg);
  })

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });


});



export { io, app, server };