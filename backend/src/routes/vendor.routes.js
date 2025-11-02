import { Router } from "express";
import {
  becomeVendor,
  checkForRequests,
  setIsAvailableToFalse,
  setIsAvailableToTrue,
  findVendors,
  createWorkRequest,
  getMyWorkRequests,
  getAllWorkRequests,
  acceptWorkRequest,
  rejectWorkRequest,
  getUsersWorkRequest,
  completeWorkRequest,
  completeWorkRequestByUser,
  vote
} from "../controllers/vendor.controller.js";

const router = Router();

// Vendor profile
router.post("/become", becomeVendor);
router.get("/requests/check", checkForRequests);

// Vendor availability
router.patch("/availability/false", setIsAvailableToFalse);
router.patch("/availability/true", setIsAvailableToTrue);

// Finding vendors
router.post("/find", findVendors);

// Work requests
router.post("/work/:vendorId", createWorkRequest);
router.get("/my-work", getMyWorkRequests);
router.get("/all-work", getAllWorkRequests);
router.post("/work/accept/:workRequestId", acceptWorkRequest);
router.post("/work/reject/:workRequestId", rejectWorkRequest);
router.get("/user/work", getUsersWorkRequest);
router.post("/work/complete/:workRequestId", completeWorkRequest);
router.post("/work/complete/user/:workRequestId", completeWorkRequestByUser);

// Voting / rating system
router.post("/vote/:vendorId", vote);

export default router;
