import express from 'express'
import { 
    createEvent,
    fetchAdmins,
    editEvent,
    deleteEvent,
    getSocietyEvents,
    getEventDetails
 } from '../controllers/events.controller.js'

const router = express.Router()

router.post("/create/:id",createEvent)//society id
router.put("/edit/:eventId",editEvent)
router.delete("/delete/:eventId",deleteEvent)
router.get("/fetchAdmins/:id",fetchAdmins)//society id


router.get("/getAll/:societyId",getSocietyEvents)
router.get("/get/:eventId",getEventDetails)

export default router