import { Router } from "express";
import { becomeStaff, uploadResume, checkForJobs } from "../controllers/staff.controller.js";

const router = Router()

router.post("/become-staff",becomeStaff)
router.post("/upload-resume",uploadResume)
router.post("/search-jobs",checkForJobs)

export default router