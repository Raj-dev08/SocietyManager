import { Router } from "express";
import { 
    createVisit, 
    getAllVisitsForMe,
    acceptVisit,
    rejectVisit,
    deleteVisits
} from "../controllers/visit.controller.js";

const router = Router()

router.post("/schedule/:visitForId", createVisit)
router.get("/getAll", getAllVisitsForMe)
router.put("/accept/:visitId", acceptVisit)
router.put("/reject/:visitId", rejectVisit)

router.post("/delete-expired", deleteVisits)

export default router