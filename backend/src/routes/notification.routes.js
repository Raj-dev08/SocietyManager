import { Router } from 'express'
import { notifyEvent } from '../controllers/notification.controller.js'

const router = Router()

router.post("/notify-event", notifyEvent )

export default router