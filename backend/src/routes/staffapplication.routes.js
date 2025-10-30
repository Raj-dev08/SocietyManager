import { Router } from "express";
import {
  createStaffApplication,
  applyForStaffRole,
  getAllStaffApplications,
  getMyStaffApplications,
  approveStaff
} from "../controllers/staffApplication.controller.js";

const router = Router();


router.post("/create",  createStaffApplication);
router.post("/apply/:applicationId", applyForStaffRole);
router.get("/all/:societyId", getAllStaffApplications);
router.get("/my", getMyStaffApplications);
router.post("/approve/:applicationId/:applicantId", approveStaff);

export default router;
