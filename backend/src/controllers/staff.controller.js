import Staffs from "../models/staff.model.js";
import cloudinary from "../lib/cloudinary.js";
import StaffApplications from "../models/staffapplication.model.js";
import Societies from "../models/society.model.js";
import { sendNotificationToFCM } from "../lib/fcm.js";
import Visit from "../models/visit.model.js";

export const becomeStaff = async (req,res,next) => {
    try {
        const { user } = req

        if ( user.role !== "User"){
            return res.status(403).json({ message: "You already have an assigned role"})
        }

        const { about, roleDescription, lat, lng, locationName , from , to } = req.body

        if( !about || !roleDescription || !lat || !lng || !locationName || !from || !to ){
            return res.status(400).json({ message: "Missing required fields" })
        }

        if ( isNaN(from) || isNaN(to) ){
            return res.status(400).json({ message: "Invalid time format"})
        }

        if (! ["security","maintenance","cleaning"].includes(roleDescription.toLowerCase())){
            return res.status(400).json({ message: "Invalid role"})
        }

        const newStaff = new Staffs({
            about,
            roleDescription: roleDescription.toLowerCase(),
            lat,
            lng,
            locationName,
            workingHours:{
                from,
                to
            }
        })

        const savedStaff = await newStaff.save()
        user.role = "Staff"
        user.userType = savedStaff._id
        await user.save()

        return res.status(200).json({ message: "Became a staff"})
    } catch (error) {
        next(error)
    }
}

export const uploadResume = async(req,res,next) => {
    try {
        const { user } = req
        const { image } = req.body

        if (user.role !== "Staff"){
            return res.status(403).json({ message: "Only for staff"})
        }
        if(!image){
            return res.status(400).json({ message: "Image is required"})
        }

        let imageUrl

        const uploadedResponse = await cloudinary.uploader.upload(image)
        imageUrl = uploadedResponse.secure_url

        user.userType.resume = imageUrl
        await user.userType.save()

        return res.status(200).json({ message: "Uploaded resume successfully"})
    } catch (error) {
        next(error)
    }
}

export const checkForJobs = async (req, res, next) => {
    try {
        const { user } = req;
        const maxDistanceKm  = req.body?.maxDistanceKm || 10

        if(isNaN(maxDistanceKm)){
            return res.status(400).json({ message: "distance must be a number"})
        }

        if (user.role !== "Staff") 
            return res.status(403).json({ message: "Only staff can check jobs" });

        const staff = user.userType
        if (!staff) return res.status(404).json({ message: "Staff profile not found" });

        const maxDistanceMeters = maxDistanceKm * 1000;

        const nearbySocieties = await Societies.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [staff.lng, staff.lat] },
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: maxDistanceMeters
                }
            }
        ]);

        const societyIds = nearbySocieties.map(s => s._id);

        const applications = await StaffApplications.find({ societyId: { $in: societyIds } })
            .populate("societyId", "name locationName lat lng")
            .lean();

        return res.status(200).json({ applications });
    } catch (error) {
        next(error);
    }
};

export const checkVisit = async (req,res,next) => {
    try {
        const { user } = req
        const { societyId } = req.params

        if(!societyId){
            return res.status(400).json({ message: "society id not available"})
        }

        if( user.role !== "Staff" ){
            return res.status(400).json({ message: "User is not a staff"})
        }

        if(user.userType.roleDescription !== "security"){
            return res.status(400).json({ message: "Only for security guards"})
        }

        const society = await Societies.findById(societyId).populate({
            path:"scheduledVisit",
            populate: [
                { path: "visitor" },
                { path: "visitFor" }
            ]
        })

        if(!society){
            return res.status(404).json({ message: "Society not found"})
        }

        if(!society.staff.some(id => id.equals(user._id))){
            return res.status(403).json({ message: "Not a staff of this society"})
        }

        const visit = society.scheduledVisit

        if(visit.length === 0 ){
            return res.status(400).json({ message: "No scheduled visit"})
        }
        
        return res.status(200).json({ visit })
    } catch (error) {
        next(error)
    }
}

export const notifyVisit = async (req,res,next) => {
    try {
        const { user } = req
        const { visitId } = req.params

        if(!visitId){
            return res.status(400).json({ message: "Visit id is required"})
        }

        if( user.role !== "Staff" ){
            return res.status(400).json({ message: "User is not a staff"})
        }

        if(user.userType.roleDescription !== "security"){
            return res.status(400).json({ message: "Only for security guards"})
        }

        const visit = await Visit.findById(visitId)
                        .populate("visitFor","fcmToken")
                        .populate("visitor","name")
                        .populate("societyId","staff")

        if (!visit){
            return res.status(404).json({ message: "visit not available"})
        }

        if (!visit.societyId.staff.some(id => id.equals(user._id))){
            return res.status(403).json({ message: "Not a staff of this society "})
        }

        if(visit.status!=="accepted"){
            return res.status(400).json({ message: "Visit not yet accepted. Contact the resident."})
        }

        if (visit.visitFor.fcmToken){
            const message = `${visit.visitor.name} has arrived for a visit`
            await sendNotificationToFCM(visit.visitFor.fcmToken,{
                title: "Your visitor has arrived 🎉",
                body: message
            })
        }

        return res.status(200).json({ message: "Successfully sent the message"})
    } catch (error) {
        next(error)
    }
}

export const setIsAvailableToFalse = async (req,res,next) => {
    try {
        const { user } = req
        
        if(user.role !== "Staff"){
            return res.status(403).json({ message: "Only for staff"})
        }

        if ( user.userType.societyId ){
            return res.status(400).json({ message: "Cant set to false while working in a society"})
        }

        user.userType.isAvailableForWork = false
        await user.userType.save()

        return res.status(200).json({ message: "Successfully set to false"})
    } catch (error) {
        next(error)
    }
}

export const setIsAvailableToTrue = async (req,res,next) => {
    try {
        const { user } = req
        
        if(user.role !== "Staff"){
            return res.status(403).json({ message: "Only for staff"})
        }

        user.userType.isAvailableForWork = true
        await user.userType.save()

        return res.status(200).json({ message: "Successfully set to true"})
    } catch (error) {
        next(error)
    }
}

// not adding the leave for user so they cant just leave and abuse it to leave they have to ask the owner