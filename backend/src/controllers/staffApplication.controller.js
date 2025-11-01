import StaffApplications from "../models/staffapplication.model.js";
import Societies from "../models/society.model.js";
import User from "../models/user.model.js";
import { redis } from "../lib/redis.js";

const deleteStaffAppCache = async (societyId) => {
  const pattern = `StaffApplication:${societyId}`;
  await redis.del(pattern);
};

export const createStaffApplication = async (req, res, next) => {
  try {
    const { user } = req;
    const { societyId, role, requirements, approxPay } = req.body;

    if (!societyId || !role || !requirements) {
      return res.status(400).json({ message: "societyId, role and requirements are required" });
    }

    if (!["security", "maintenance", "cleaning"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const society = await Societies.findById(societyId);
    if (!society) return res.status(404).json({ message: "Society not found" });

    if (society.owner.toString() !== user._id.toString() ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const newApp = new StaffApplications({
      societyId,
      role,
      requirements,
      approxPay: approxPay || "",
      applicants: []
    });

    const saved = await newApp.save();
    await deleteStaffAppCache(societyId);

    return res.status(201).json({ message: "Staff application created", application: saved });
  } catch (err) {
    next(err);
  }
};

export const applyForStaffRole = async (req, res, next) => {
  try {
    const { user } = req;
    const { applicationId } = req.params;

    if (user.role !== "Staff") {
      return res.status(403).json({ message: "Only staff can apply" });
    }

    const application = await StaffApplications.findById(applicationId).populate("societyId","staff");
    
    if (!application) return res.status(404).json({ message: "Application not found" });

    const society = application.societyId
    
    if (application.applicants.some(id => id.equals(user._id))) {
      return res.status(400).json({ message: "Already applied for this opening" });
    }

    if(society.staff.some(id => id.equals(user._id))){
      return res.status(400).json({ message: "already a staff member of this society"})
    }

    application.applicants.push(user._id);
    await application.save();

    await redis.del(`StaffApplication:${application.societyId}`);
    await redis.del(`MyStaffApplications:${user._id}`);

    return res.status(200).json({ message: "Applied successfully" });
  } catch (err) {
    next(err);
  }
};

export const getAllStaffApplications = async (req, res, next) => {
  try {
    const { user } = req;
    const { societyId } = req.query;

    if (!societyId) return res.status(400).json({ message: "societyId required" });

    const society = await Societies.findById(societyId);
    if (!society) return res.status(404).json({ message: "Society not found" });

    if (society.owner.toString() !== user._id.toString() ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const cacheKey = `StaffApplication:${societyId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json({ applications: JSON.parse(cached) })
  

    const applications = await StaffApplications.find({ societyId })
      .populate("applicants", "name email profilePic role")
      .populate("societyId", "name locationName")
      .lean();

    await redis.set(cacheKey, JSON.stringify(applications), "EX", 60 * 60 * 24);
    return res.status(200).json({ applications });
  } catch (err) {
    next(err);
  }
};

export const getMyStaffApplications = async (req, res, next) => {
  try {
    const { user } = req;

    const cacheKey = `MyStaffApplications:${user._id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json({ applications: JSON.parse(cached) });

    const applications = await StaffApplications.find({ applicants: user._id })
      .populate("societyId", "name locationName")
      .lean();

    await redis.set(cacheKey, JSON.stringify(applications), "EX", 60 * 60 * 24);
    return res.status(200).json({ applications });
  } catch (err) {
    next(err);
  }
};

export const approveStaff = async (req, res, next) => {
  try {
    const { user } = req;
    const { applicationId, applicantId } = req.params;

    const app = await StaffApplications.findById(applicationId);
    if (!app) return res.status(404).json({ message: "Application not found" });

    const society = await Societies.findById(app.societyId);
    if (!society) return res.status(404).json({ message: "Society not found" });

    if (society.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!app.applicants.some(id => id.equals(applicantId))) {
      return res.status(400).json({ message: "User did not apply for this opening" });
    }

    if (society.staff.some(id => id.equals(applicantId))){
      return res.status(400).json({ message: "User is already a staff"})
    }


    const applicant = await User.findById(applicantId).populate("userType");
    if (!applicant) return res.status(404).json({ message: "Applicant not found" });

    applicant.userType.societyId = society._id
    society.staff.push(applicant._id)
    await society.save()
    await applicant.userType.save()

    await deleteStaffAppCache(society._id);
    await redis.del(`MyStaffApplications:${applicant._id}`);

    return res.status(200).json({ message: "Staff hired successfully", staff: applicant });
  } catch (err) {
    next(err);
  }
};
