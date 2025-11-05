import {Router} from 'express';
import { 
    sendMessages,
    getMessages,
    deleteMessage,
    getUnreadMessagesCount,
    editMessage
} from '../controllers/groupchat.controller.js';
const router = Router();

router.post('/send/:id' , sendMessages);
router.get('/get/:id', getMessages);
router.put('/edit/:id', editMessage);

router.delete('/delete/:id', deleteMessage);
router.get('/unread/:id', getUnreadMessagesCount);

export default router;