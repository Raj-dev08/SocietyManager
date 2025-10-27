import express from 'express'
import { protectRoute } from '../middleware/auth.middleware.js'
import { 
    applyForSociety,
    approveApplication,
    rejectApplication,
    getApplications,
    checkMyApplications
 } from '../controllers/apply.controller.js'

const router = express.Router();

router.post("/apply/:id",protectRoute, applyForSociety)

router.put("/accept/:applicationId", protectRoute, approveApplication)
router.put("/reject/:applicationId", protectRoute, rejectApplication)

router.get("/get-application", protectRoute, getApplications)
router.get("/get-my-applications", protectRoute, checkMyApplications)

export default router