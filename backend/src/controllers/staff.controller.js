import Staffs from "../models/staff.model.js";
import cloudinary from "../lib/cloudinary.js";
import StaffApplications from "../models/staffapplication.model.js";
import Societies from "../models/society.model.js";

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

        if ( ["security","maintenance","cleaning"].includes(roleDescription.toLowerCase())){
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
        const { maxDistanceKm } = req.body || 10

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