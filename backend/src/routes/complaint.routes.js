import express from 'express'
import { 
    createComplaint,
    getComplaints,
    markAsFixed,
    verifyFix,
    deleteComplaint,
    vote
 } from '../controllers/complaints.controller.js'

const router = express.Router()

router.post("/create/:id",createComplaint)//society id
router.get("/get-all/society/:id",getComplaints)
router.put("/markFix/:id",markAsFixed)
router.put("/verifyFix/:id",verifyFix)
router.put("/vote/:id",vote)
router.delete("/delete/:id",deleteComplaint)

export default router
// no edit in complaint as anyone can misuse it or play victim and make conflicts