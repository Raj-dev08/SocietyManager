import Complaints from "../models/complaints.model.js";
import Societies from "../models/society.model.js";
import cloudinary from "../lib/cloudinary.js";
import { redis } from "../lib/redis.js";
import { sendNotificationToFCM } from "../lib/fcm.js";

export const createComplaint = async (req,res,next) => {
    try {
        const { user } = req;
        const societyId = req.params.id
        const { header, description, image } = req.body 

        if(!societyId){
            return res.status(400).json({ message: "Society id not found "})
        }

        if( !header || !description ){
            return res.status(400).json({ message: "Required fields missing" })
        }

        const society = await Societies.findById(societyId)

        if(!society){
            return res.status(404).json({ message: "Society not found "})
        }

        if ( !society.members.some(id => id.equals(user._id)) && 
            !society.admins.some(id => id.equals(user._id)) &&
            !society.owner.equals(user._id)
        )
        {
            return res.status(401).json({ message: "You are not authorised with this society"})
        }

        let imageUrl;
        if(image){
            const uploadedResponse = await cloudinary.uploader.upload(image)
            imageUrl = uploadedResponse.secure_url
        }

        const complaint = await Complaints.create({
            header,
            description,
            image:imageUrl,
            raisedBy:user._id,
            societyId
        })

        society.complaints.push(complaint._id)

        await society.save()

        await redis.set(`Society:${societyId}`,JSON.stringify(society),"EX", 60 * 60 )
        await redis.del(`Complaints:${societyId}`)

        return res.status(201).json({ message: "Complaint created successfully" , complaint })
    } catch (error) {
        next(error)
    }
}

export const getComplaints = async (req, res, next) => {
    try {
        const { user } = req
        const { id: societyId } = req.params;

        const cacheKey = `Complaints:${societyId}`;
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            return res.status(200).json({ complaints: JSON.parse(cachedData)});
        }

        let society;
        const cacheKeyForSociety = `Society:${societyId}`
        const cachedSociety = await redis.get(cacheKeyForSociety)

        if( cachedSociety ){
            society = JSON.parse(cachedSociety)
        }
        else{
            society = await Societies.findById(societyId).lean()
        }

        if(!society){
            return res.status(400).json({ message: "Society not found" })
        }

        if ( !society.members.some(id => id.toString() === user._id.toString()) && 
            !society.admins.some(id => id.toString() === user._id.toString()) &&
            society.owner.toString() !== user._id.toString()
        )
        {
            return res.status(401).json({ message: "You are not authorised with this society"})
        }

        const complaints = await Complaints.find({ societyId })
        .populate("raisedBy", "name email profilePic")
        .sort({ createdAt: -1 })
        .lean();

        await redis.set(cacheKey, JSON.stringify(complaints), "EX", 60 * 60);

        return res.status(200).json({ complaints });
    } catch (error) {
        next(error);
    }
};

// ✅ Mark complaint fixed (admin or owner only)
export const markAsFixed = async (req, res, next) => {
    try {
        const { user } = req;
        const complaintId = req.params.id;

        const complaint = await Complaints.findById(complaintId).populate("raisedBy","fcmToken");
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        let society;
        const cacheKeyForSociety = `Society:${complaint.societyId}`
        const cachedSociety = await redis.get(cacheKeyForSociety)

        if( cachedSociety ){
            society = JSON.parse(cachedSociety)
        }
        else{
            society = await Societies.findById(complaint.societyId).lean()
        }

        if(!society){
            return res.status(400).json({ message: "Society not found" })
        }

        if ( !society.admins.some(id => id.toString() === user._id.toString()) 
            && society.owner.toString() !== user._id.toString())
        {
            return res.status(401).json({ message: "You are not authorised with this society"})
        }

        complaint.fixedByAdmins = true;
        await complaint.save();

        if(complaint.raisedBy.fcmToken){
            await sendNotificationToFCM(complaint.raisedBy.fcmToken,{
                title: "Complaint fix 🎊",
                body: "Your complaint is fixed by admins. Please update your complaint"
            })
        }

        await redis.del(`Complaints:${society._id}`);

        return res.status(200).json({ message: "Marked as fixed", complaint });
    } catch (error) {
        next(error);
    }
};

// ✅ Verify fix (only the user who raised it)
export const verifyFix = async (req, res, next) => {
    try {
        const { user } = req;
        const complaintId = req.params.id;

        const complaint = await Complaints.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        if (complaint.raisedBy.toString() !== user._id.toString()) {
            return res.status(403).json({ message: "Only the one who raised it can verify" });
        }

        if( complaint.verifiedByUser){
            return res.status(400).json({ message: "Already verified" })
        }

        complaint.verifiedByUser = true;
        await complaint.save();

        await redis.del(`Complaints:${complaint.societyId}`);

        return res.status(200).json({ message: "Verified by user", complaint });
    } catch (error) {
        next(error);
    }
};

// ✅ Delete complaint (only owner or admin or raisedBy)
export const deleteComplaint = async (req, res, next) => {
    try {
        const { user } = req;
        const complaintId = req.params.id;

        const complaint = await Complaints.findById(complaintId);

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        let society;
        const cacheKeyForSociety = `Society:${complaint.societyId}`
        const cachedSociety = await redis.get(cacheKeyForSociety)

        if( cachedSociety ){
            society = JSON.parse(cachedSociety)
        }
        else{
            society = await Societies.findById(complaint.societyId).lean()
        }

        if(!society){
            return res.status(400).json({ message: "Society not found" })
        }

        if ( complaint.raisedBy.toString() !== user._id.toString() &&
            !society.admins.some(id => id.toString() === user._id.toString()) &&
            society.owner.toString() !== user._id.toString() 
        ) {
            return res.status(403).json({ message: "Not authorized to delete this complaint" });
        }

        await Complaints.findByIdAndDelete(complaintId);
        await Societies.findByIdAndUpdate(complaint.societyId, {
            $pull: { complaints: complaintId },
        });

        await redis.del(`Complaints:${complaint.societyId}`);
        await redis.del(`Society:${complaint.societyId}`)

        return res.status(200).json({ message: "Complaint deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const vote = async (req,res,next) => {
    try {
        const { user } = req
        const { method } = req.query
        const complaintId = req.params.id

        if(!method){
            return res.status(400).json({ message: "Must have method"})
        }

        if ( !complaintId || !["agree","disagree"].includes(method.toLowerCase())){
            return res.status(400).json({ message: "invalid request params"})
        }

        const complaint = await Complaints.findById(complaintId)

        if(!complaint){
            return res.status(404).json({ message: "Complaint not found "})
        }

        let society;
        const cacheKeyForSociety = `Society:${complaint.societyId}`
        const cachedSociety = await redis.get(cacheKeyForSociety)

        if( cachedSociety ){
            society = JSON.parse(cachedSociety)
        }
        else{
            society = await Societies.findById(complaint.societyId).lean()
        }

        if(!society){
            return res.status(400).json({ message: "Society not found" })
        }

        if ( !society.members.some(id => id.toString() === user._id.toString()) && 
            !society.admins.some(id => id.toString() === user._id.toString()) &&
            society.owner.toString() !== user._id.toString()
        )
        {
            return res.status(401).json({ message: "You are not authorised with this society"})
        }

        if (method.toLowerCase() === "agree"){
            if ( complaint.agreed.some(id => id.equals(user._id)) ){
                complaint.agreed.pull(user._id)
            }
            else{
                if( complaint.disagreed.some(id => id.equals(user._id)) ){
                    complaint.disagreed.pull(user._id)
                }
                complaint.agreed.push(user._id)
            }
        }
        else if (method.toLowerCase() === "disagree"){
            if ( complaint.disagreed.some(id => id.equals(user._id)) ){
                complaint.disagreed.pull(user._id)
            }
            else{
                if( complaint.agreed.some(id => id.equals(user._id)) ){
                    complaint.agreed.pull(user._id)
                }
                complaint.disagreed.push(user._id)
            }      
        }

        await complaint.save()

        await redis.del(`Complaints:${complaint.societyId}`);

        return res.status(200).json({ message: "Voted successfully" })
    } catch (error) {
        next(error)
    }
}
