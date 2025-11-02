import { Router } from "express";
import { 
    searchUser,
    sendFriendRequest,
    getAllFriendRequestToMe,
    getAllFriendRequestFromMe,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest
} from "../controllers/friend.controller.js";

const router = Router()

router.get("/search-profiles",searchUser)
router.post("/send-request/:userId",sendFriendRequest)
router.get("/get-requests-to-me",getAllFriendRequestToMe)
router.get("/get-requests-from-me",getAllFriendRequestFromMe)
router.put("/accept-request/:requestId",acceptFriendRequest)
router.put("/reject-request/:requestId",rejectFriendRequest)
router.put("/cancel-request/:requestId",cancelFriendRequest)

export default router