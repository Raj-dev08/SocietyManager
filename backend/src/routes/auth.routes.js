import express from 'express'
import { protectRoute } from '../middleware/auth.middleware.js'
import { 
    sendOtp, 
    verifyOTP, 
    login, 
    logout, 
    checkAuth, 
    updateProfile,
    getOTPForMobileNumber,
    verifyMobileOTP,
    updateFcmToken
} from '../controllers/auth.controller.js'

const router = express.Router()

router.post("/send-otp",sendOtp)
router.post("/verify-otp",verifyOTP)
router.post("/login",login)
router.post("/logout",logout)

router.get("/check", protectRoute , checkAuth)
router.put("/update-profile", protectRoute, updateProfile)

router.get("/mobile-verification", protectRoute, getOTPForMobileNumber)
router.post("/verify-mobile", protectRoute, verifyMobileOTP)

router.put("/updateFcmToken", protectRoute, updateFcmToken)

export default router