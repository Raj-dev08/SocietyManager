import { Router } from "express";
import { 
    assignTask,
    getAllMyPendingTasks,
    getAllMyTasks,
    completeTask,
    verifiedByOwner,
    deactivateAdmin,
    ActivateAdmin
} from "../controllers/task.controller.js";

const router = Router()

router.post("/assign-to/:userId/from/:societyId",assignTask)
router.get("/get-pending-tasks/:societyId",getAllMyPendingTasks)
router.get("/get-all-tasks",getAllMyTasks)
router.post("/complete-task/:taskId",completeTask)
router.post("/verify/:taskId",verifiedByOwner)
router.put("/deactivate-admin",deactivateAdmin)
router.put("/activate-admin",ActivateAdmin)

export default router