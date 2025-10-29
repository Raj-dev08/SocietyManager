import { Router } from 'express'
import { 
    giveOwnerPermission , 
    findForUser , 
    revokeOwnerPermission 
} from '../controllers/role.controller.js'

const router = Router()

router.post("/give-owner-permission/:userId", giveOwnerPermission)
router.post("/find-user", findForUser)
router.post("/take-owner-permission/:userId", revokeOwnerPermission)

export default router