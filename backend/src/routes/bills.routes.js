import express, { Router } from "express";
import {
  createBill,
  getBillsForFlat,
  payBill,
  verifyPayment,
  razorpayWebhook
} from "../controllers/bills.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();


router.post("/:societyId", protectRoute, createBill);
router.get("/:societyId/:houseNo", protectRoute, getBillsForFlat);
router.post("/pay/:billId", protectRoute, payBill);
router.post("/verify", protectRoute, verifyPayment);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);//set the webhook directly in razorpay

export default router;
