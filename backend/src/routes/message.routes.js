import { Router } from "express";
import { 
    sendMessage,
    getMessages,
    deleteMessage,
    editMessage,
    getUnreadMessagesCount
} from "../controllers/message.controller.js";

const router = Router();

router.post("/send/:id", sendMessage);
router.get("/get/:id", getMessages);
router.delete("/delete/:id", deleteMessage);
router.put("/edit/:id", editMessage);
router.get("/unread", getUnreadMessagesCount);

export default router;