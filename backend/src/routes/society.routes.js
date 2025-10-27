import express from 'express'
import { protectRoute } from '../middleware/auth.middleware.js'
import { 
    createSociety,
    editSociety,
    deleteSociety,
    getSocietyDetails,
    getSocieties
 } from '../controllers/society.controller.js'

const router = express.Router()

router.post("/create", protectRoute, createSociety)
router.put("/edit/:id", protectRoute, editSociety)
router.delete("/delete/:id", protectRoute, deleteSociety)

router.get("/get",getSocieties)
router.get("/get/:id",getSocietyDetails)

export default router