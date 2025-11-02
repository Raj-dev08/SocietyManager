import { Router } from "express";
import { becomeStaff, uploadResume, checkForJobs , checkVisit, notifyVisit , setIsAvailableToFalse , setIsAvailableToTrue } from "../controllers/staff.controller.js";

const router = Router()

router.post("/become-staff",becomeStaff)
router.post("/upload-resume",uploadResume)
router.post("/search-jobs",checkForJobs)
router.get("/check-visit/:societyId",checkVisit)
router.put("/notify-visit/:visitId",notifyVisit)
router.put("/set-to-false",setIsAvailableToFalse)
router.put("/set-to-true",setIsAvailableToTrue)

export default router