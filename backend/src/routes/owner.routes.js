import { Router } from "express";
import { 
    giveAdminAccess,
    takeAdminAccess,
    seeAllAdmins,
    seeAllMembers
} from "../controllers/owner.controller.js";

const router = Router()

router.post("/give-admin-access/:targetedUserId/from/:societyId",giveAdminAccess)
router.post("/take-admin-access/:targetedUserId/from/:societyId",takeAdminAccess)
router.get("/get-all-members/:societyId",seeAllMembers)
router.get("/get-all-admins/:societyId",seeAllAdmins)

export default router