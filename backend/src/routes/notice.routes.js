import { Router } from "express";
import { 
    createNotice,
    editNotice,
    deleteNotice,
    getSocietyNotices,
    getNoticeDetails
 } from "../controllers/notice.controller.js"; 

const router = Router()

router.post("/create/:societyId", createNotice)
router.put("/edit/:noticeId", editNotice)
router.delete("/delete/:noticeId", deleteNotice)
router.get("/get-all/:societyId", getSocietyNotices)
router.get("/get-one/:noticeId", getNoticeDetails)

export default router