import Application from "../models/application.model.js";
import Societies from "../models/society.model.js";
import { redis } from "../lib/redis.js";

const deleteApplicationCache = async (societyId) => {
    const pattern = `Application:${societyId}*`
    const keys = await redis.keys(pattern)
    if (keys.length > 0 ){
        await redis.del(keys)
    }
}

export const applyForSociety = async (req, res, next) => {
  try {
    const { user } = req;
    const { societyId } = req.body;

    if (!societyId) {
      return res.status(400).json({ message: "Society ID is required" });
    }

    const society = await Societies.findById(societyId);
    if (!society) {
      return res.status(404).json({ message: "Society not found" });
    }

    if ( society.members.includes(user._id) ){
        return res.status(400).json({ message: "Already a member of the society "})
    }

    // Prevent duplicate applications
    const existingApplication = await Application.findOne({
      applicant: user._id,
      appliedFor: societyId
    });

    if (existingApplication) {
      return res.status(400).json({ message: "You have already applied to this society" });
    }

    const application = new Application({
      applicant: user._id,
      appliedFor: societyId
    });

    const savedApp = await application.save();

    await deleteApplicationCache(societyId)
    await redis.del(`MyApplication:${user._id}`)

    return res.status(201).json({ message: "Application submitted", application: savedApp });
  } catch (error) {
    next(error);
  }
};

// Approve an application
export const approveApplication = async (req, res, next) => {
  try {
    const { user } = req;
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId).populate("appliedFor").populate("applicant");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Only owner or admin of the society can approve
    const society = application.appliedFor;
    const applicant = application.applicant;

    if (society.owner.toString() !== user._id.toString() && !society.admins.includes(user._id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    application.status = "approved";
    application.reviewedBy = user._id;
    application.reviewedAt = new Date();
    const updatedApp = await application.save();
    

    applicant.societyId = society._id
    await applicant.save()
    // Add applicant to society members
    if (!society.members.includes(application.applicant)) {
      society.members.push(application.applicant);
      society.memberCount+=1
      await society.save();
    }

    await deleteApplicationCache(society._id)
    await redis.del(`MyApplication:${application.applicant}`)
    await redis.set(`Society:${society._id}`,JSON.stringify(society), "EX" , 60 * 60 * 24 )

    return res.status(200).json({ message: "Application approved", application: updatedApp });
  } catch (error) {
    next(error);
  }
};

// Reject an application
export const rejectApplication = async (req, res, next) => {
  try {
    const { user } = req;
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId).populate("appliedFor");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const society = application.appliedFor;
    if (society.owner.toString() !== user._id.toString() && !society.admins.includes(user._id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    application.status = "rejected";
    application.reviewedBy = user._id;
    application.reviewedAt = new Date();
    const updatedApp = await application.save();

    await deleteApplicationCache(society._id)
    await redis.del(`MyApplication:${application.applicant}`)
    await redis.set(`Society:${society._id}`,JSON.stringify(society), "EX" , 60 * 60 * 24 )

    return res.status(200).json({ message: "Application rejected", application: updatedApp });
  } catch (error) {
    next(error);
  }
};

export const getApplications = async (req, res, next) => {
  try {
    const { user } = req
    const { societyId , status} = req.query;

    if (!societyId ) {
      return res.status(400).json({ message: "Society ID is required" });
    }

    const society = await Societies.findById(societyId)

    if(!society){
        return res.status(404).json({ message: "Society not found "})
    }

    if ( society.owner.toString() !== user._id.toString() && !society.admins.includes(user._id)){
        return res.status(403).json({ message: "Unauthorized"})
    }

    if ( status && !["pending", "approved", "rejected"].includes(status) ){
        return res.status(400).json({ message: "Invalid status"})
    }

    const cacheKey = status ? `Application:${societyId},Status:${status}` : `Application:${societyId}`;
    const cachedResponse = await redis.get(cacheKey)

    if (cachedResponse){
        return res.status(200).json({ applications: JSON.parse(cachedResponse)})
    }

    const query = { appliedFor: societyId };
    if (status){
        query.status = status;
    } 

    const applications = await Application.find(query)
      .populate("applicant", "name email profilePic")
      .populate("reviewedBy", "name email profilePic")
      .populate("appliedFor", "name description images")
      .lean();

    await redis.set(cacheKey, JSON.stringify(applications), "EX" , 60 * 60 * 24 )


    return res.status(200).json({ applications });
  } catch (error) {
    next(error);
  }
};

export const checkMyApplications = async (req,res,next) => {
    try {
        const { user } = req

        const cacheKey = `MyApplication:${user._id}`

        const cachedResponse = await redis.get(cacheKey)

        if(cachedResponse){
            return res.status(200).json({ applications: JSON.parse(cachedResponse)})
        }

        const applications = await Application.find({ applicant : user._id })
            .populate("appliedFor","name description images")
            .populate("reviewedBy", "name email profilePic")
            .lean();

        await redis.set(cacheKey,JSON.stringify(applications), "EX", 60 * 60 * 24 )

        return res.status(200).json({ applications })
    } catch (error) {
        next(error)
    }
}
