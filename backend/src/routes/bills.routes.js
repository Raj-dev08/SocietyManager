import express, { Router } from "express";
import {
  createBill,
  getBillsForFlat,
  payBill,
  verifyPayment,
  razorpayWebhook,
  applyForCashPayment,
  verifyCashPayment,
  deleteBills
} from "../controllers/bills.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();


router.post("/:societyId", protectRoute, createBill);
router.get("/:societyId/:houseNo", protectRoute, getBillsForFlat);
router.post("/pay/:billId", protectRoute, payBill);
router.post("/verify", protectRoute, verifyPayment);
router.post("/apply/:billId/:societyId/:houseNo", protectRoute, applyForCashPayment)
router.post("/verify/:societyId/:billId", protectRoute, verifyCashPayment)
router.delete("/delete/:billId/:societyId", protectRoute, deleteBills)

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);//set the webhook directly in razorpay

export default router;
