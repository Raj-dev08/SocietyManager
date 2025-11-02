import Vendors from "../models/vendor.model.js";
import WorkRequest from "../models/workrequest.model.js";
import Societies from "../models/society.model.js";
import { redis } from "../lib/redis.js";
import { isValidDate } from "./notice.controller.js";
import { sendNotificationToFCM } from "../lib/fcm.js";

function calculateDistance(lat1, lng1, lat2, lng2) {
    const toRad = (x) => (x * Math.PI) / 180;

    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    // earth's formula to calculate distance
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

export const becomeVendor = async (req,res,next) => {
    try {
        const { user } = req

        if ( user.role !== "User"){
            return res.status(403).json({ message: "You already have an assigned role"})
        }

        const { services , about , lat , lng , locationName , from , to , payment } = req
        
        if ( !services || !about || !lat || !lng || !locationName || !from || !to  ){
            return res.status(400).json({ message: "Missing required fields" })
        }

        if ( isNaN(from) || isNaN(to) ){
            return res.status(400).json({ message: "Invalid time format"})
        }

        const vendor = new Vendors({
            userId: user._id,
            services,
            about,
            lat,
            lng,
            locationName,
            workHours:{
                from,
                to
            },
            payment
        })
        const savedVendor = await vendor.save()
        user.role = "Vendor"
        user.userType = savedVendor._id
        await user.save()

        return res.status(200).json({ message: "Became a vendor"})
    } catch (error) {
        next(error)
    }
}

export const checkForRequests = async (req,res,next) => {
    try {
        const { user } = req

        if ( user.role !== "Vendor"){
            return res.status(403).json({ message: "You already have an assigned role"})
        }

        const cacheKey = `VendorRequests:${user._id}`
        const cachedWork = await redis.get(cacheKey)

        if(cachedWork){
            return res.status(200).json({ workRequests: JSON.parse(cachedWork) })
        }


        const vendor = await Vendors.findById(user.userType).populate("workRequests")

        if(!vendor){
            return res.status(404).json({ message: "Vendor profile not found"})
        }

        if(vendor.workRequests.length === 0){
            return res.status(200).json({ message: "No work requests"})
        }

        await redis.set( cacheKey, JSON.stringify(vendor.workRequests), "EX", 60 * 60 * 24 )

        return res.status(200).json({ workRequests: vendor.workRequests })
    } catch (error) {
        next(error)
    }
}

export const setIsAvailableToFalse = async (req,res,next) => {
    try {
        const { user } = req

        if ( user.role !== "Vendor" ){
            return res.status(403).json({ message: "Only for vendors"})
        }

        if(!user.userType){
            return res.status(404).json({ message: "Vendor profile not found"})
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

        if ( user.role !== "Vendor" ){
            return res.status(403).json({ message: "Only for vendors"})
        }

        if(!user.userType){
            return res.status(404).json({ message: "Vendor profile not found"})
        }

        user.userType.isAvailableForWork = true
        await user.userType.save()

        return res.status(200).json({ message: "Successfully set to true"})
    } catch (error) {
        next(error)
    }
}

export const findVendors = async (req,res,next) => {
    try {
        const { user } = req
        const { lat, lng , maxDistanceKm } = req.body

        if(maxDistanceKm && isNaN(maxDistanceKm)){
            return res.status(400).json({ message: "distance must be a number"})
        }

        let latitude , longitude ;
        if ( !user.societyId && !( lat  && lng )){
            return res.status(400).json({ message: "Location is required"})
        }

        if ( lat && lng ) {
            if (isNaN(lat) || isNaN(lng)){
                return res.status(400).json({ message: "Invalid location format"})
            }
            latitude = lat
            longitude = lng
        }
        else if ( user.societyId  ) {
            const society = await Societies.findById(user.societyId)
            if(!society) return res.status(404).json({ message: "Society not found"})
            latitude = society.lat
            longitude = society.lng
        }
        else{
            return res.status(400).json({ message: "Location is required"})
        }

        const cacheKey = `Vendors:${latitude},${longitude}`
        const cachedVendors = await redis.get(`Vendors:${latitude},${longitude}`)

        if ( cachedVendors){
            return res.status(200).json({ vendors: JSON.parse(cachedVendors) })
        }
        const vendorsAroundYou = await Vendors.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [longitude, latitude] },
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: maxDistanceKm ? maxDistanceKm * 1000 : 10000
                }
            },
            { $match: { isAvailableForWork: true } },
            {
                $lookup: {
                    from: "users",//mongo model makes User to lowercase plural
                    localField: "userId",
                    foreignField: "_id",
                    as: "user" // can be anything i want but u have to change it in unwind and project too
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    services: 1,
                    about: 1,
                    payment: 1,
                    distance: 1,
                    locationName: 1,
                    workHours: 1,
                    ratings: 1,
                    lat: 1,
                    lng: 1,
                    "user._id": 1,
                    "user.name": 1,
                    "user.email": 1,
                    "user.profilePic": 1,
                    "user.mobileNumber": 1,
                    "user.isMobileNumberVerified": 1
                }
            }
        ])

        if ( vendorsAroundYou.length === 0 ){
            return res.status(200).json({ message: "No vendors available near you , maybe increase the distance"})
        }

        await redis.set( cacheKey, JSON.stringify(vendorsAroundYou), "EX", 60 * 60  ) // not invalidating cache so cant get new vendors for 1 hour ensuring profits to vendor
        return res.status(200).json({ vendors: vendorsAroundYou })
    } catch (error) {
        next(error)
    }   
}


export const createWorkRequest = async (req,res,next) => {
    try {
        const { user } = req
        const { vendorId } = req.params
        const { description , workDate , lat , lng , locationName , payment } = req.body

        if(!description || !workDate || !lat || !lng || !locationName || !payment ) { 
            return res.status(400).json({ message: "Missing required fields"})
        }

        if ( !vendorId ){
            return res.status(400).json({ message: "Vendor id is required"})
        }


        if ( !isValidDate(workDate) ){
            return res.status(400).json({ message: "Invalid date format"})
        }

        if ( isNaN(payment) ){
            return res.status(400).json({ message: "Invalid payment format"})
        }

        if (isNaN(lat) || isNaN(lng)){
            return res.status(400).json({ message: "Invalid location format"})     
        }

        const vendor = await Vendors.findById(vendorId)

        if(!vendor){
            return res.status(404).json({ message: "Vendor not found"})
        }


        let workRequest 

        if ( user.societyId ){
            workRequest = new WorkRequest({
                societyId: user.societyId,
                requestedBy: user._id,
                requestedTo: vendor.userId,
                description,
                workDate,
                lat,
                lng,
                locationName,
                payment,
                distanceFromUser: calculateDistance(lat,lng,vendor.lat,vendor.lng)
            })
        } else {
            workRequest = new WorkRequest({
                requestedBy: user._id,
                requestedTo: vendorId,
                description,
                workDate,
                lat,
                lng,
                locationName,
                payment,
                distanceFromUser: calculateDistance(lat,lng,vendor.lat,vendor.lng)
            })
        }

        const savedWorkRequest = await workRequest.save()
        vendor.workRequests.push(savedWorkRequest._id)
        await vendor.save()
        await redis.del(`MyWorkRequests:${vendorId}`)

        return res.status(201).json({ message: "Work request created", workRequest: savedWorkRequest })
    } catch (error) {
       next(error) 
    }
}

export const getMyWorkRequests = async (req,res,next) => {
    try {
        const { user } = req

        if ( user.role !== "Vendor" ){
            return res.status(403).json({ message: "Only for vendors"})
        }
        const cacheKey = `MyWorkRequests:${user._id}`
        const cachedWork = await redis.get(cacheKey)

        if(cachedWork){
            return res.status(200).json({ workRequests: JSON.parse(cachedWork) })
        }


        const workRequests = await WorkRequest.find({ requestedTo: user._id , status: "pending"})
                            .sort({ distanceFromUser: 1 })
        
        if(workRequests.length === 0){
            return res.status(200).json({ message: "No work requests"})
        }
        await redis.set( cacheKey, JSON.stringify(workRequests), "EX", 60 * 60 * 24 )

        return res.status(200).json({ workRequests })
    } catch (error) {
        next(error)
    }
}

export const getAllWorkRequests = async (req,res,next) => {
    try {
        const { user } = req

        if ( user.role !== "Vendor" ){
            return res.status(403).json({ message: "Only for vendors"})
        }

        await user.userType.populate("workRequests")
        const workRequests = user.userType.workRequests

        if(workRequests.length === 0){
            return res.status(200).json({ message: "No work requests"})
        }

        return res.status(200).json({ workRequests })
    } catch (error) {
        next(error)
    }
}

export const acceptWorkRequest = async (req,res,next) => {
    try {
        const { user } = req
        const { workRequestId } = req.params

        if ( user.role !== "Vendor" ){
            return res.status(403).json({ message: "Only for vendors"})
        }

        const workRequest = await WorkRequest.findById(workRequestId).populate("requestedBy","fcmToken")

        if(!workRequest){
            return res.status(404).json({ message: "Work request not found"})
        }

        if(! workRequest.requestedTo.equals(user._id) ){
            return res.status(403).json({ message: "Not authorized"})
        }
        if(workRequest.status !== "pending"){
            return res.status(400).json({ message: "Work request already accepted or rejected"})
        }

        workRequest.status = "accepted"
        await workRequest.save()
        
        const message = `${user.name} has accepted your work request. Please contact with him for more information`
        if(workRequest.requestedBy.fcmToken){
            await sendNotificationToFCM(workRequest.requestedBy.fcmToken,{
                title: "Work Request accepted ✨",
                body: message
            })
        }

        return res.status(200).json({ message: "Work request accepted"})
    } catch (error) {
        next(error)
    }
}

export const rejectWorkRequest = async (req,res,next) => {
    try {
        const { user } = req
        const { workRequestId } = req.params
        const { reasonForRejection } = req.body

        if(!reasonForRejection){
            return res.status(400).json({ message: "Reason for rejection is required"})
        }

        if ( user.role !== "Vendor" ){
            return res.status(403).json({ message: "Only for vendors"})
        }

        const workRequest = await WorkRequest.findById(workRequestId).populate("requestedBy","fcmToken")

        if(!workRequest){
            return res.status(404).json({ message: "Work request not found"})
        }

        if(! workRequest.requestedTo.equals(user._id) ){
            return res.status(403).json({ message: "Not authorized"})
        }
        if(workRequest.status !== "pending"){
            return res.status(400).json({ message: "Work request already accepted or rejected"})
        }

        workRequest.status = "rejected"
        workRequest.reasonForRejection = reasonForRejection
        await workRequest.save()
        
        const message = `${user.name} has rejected your work request. Please contact with him for more information`
        if(workRequest.requestedBy.fcmToken){
            await sendNotificationToFCM(workRequest.requestedBy.fcmToken,{
                title: "Work Request rejected 😢",
                body: message
            })
        }

        return res.status(200).json({ message: "Work request rejected"})
    } catch (error) {
        next(error)
    }
}

export const getUsersWorkRequest = async (req,res,next) => {
    try {
        const { user } = req
        
        const sentWorkRequests = await WorkRequest.find({ requestedBy: user._id })

        if ( sentWorkRequests.length === 0 ){
            return res.status(200).json({ message: "No work requests"})
        }

        return res.status(200).json({ workRequests: sentWorkRequests })
    } catch (error) {
        next(error)
    }
}

export const completeWorkRequest = async (req,res,next) => {
    try {
        const { user } = req
        const { workRequestId } = req.params

        if(!workRequestId){
            return res.status(400).json({ message: "Work request id is required"})
        }

        const workRequest = await WorkRequest.findById(workRequestId).populate("requestedBy","fcmToken")


        if(!workRequest){
            return res.status(404).json({ message: "Work request not found"})
        }

        if(!workRequest.requestedTo.equals(user._id)){
            return res.status(403).json({ message: "Unauthorized access"})
        }

        if(workRequest.status!=="accepted"){
            return res.status(400).json({ message: "Work request is not accepted"})
        }

        workRequest.isWorkDone = true
        await workRequest.save()

        if(workRequest.requestedBy.fcmToken){
            await sendNotificationToFCM(workRequest.requestedBy.fcmToken,{
                title: "Work is done",
                body: "Work is done please verify it and update the status "
            })
        }

        return res.status(200).json({ message: "Work request completed"})
    } catch (error) {
        next(error)
    }
}

export const completeWorkRequestByUser = async (req,res,next) => {
    try {
        const { user } = req
        const { workRequestId } = req.params

        if(!workRequestId){
            return res.status(400).json({ message: "Work request id is required"})
        }

        const workRequest = await WorkRequest.findById(workRequestId)

        if(!workRequest){
            return res.status(404).json({ message: "Work request not found"})
        }

        if(!workRequest.requestedBy.equals(user._id)){
            return res.status(403).json({ message: "Unauthorized access"})
        }
        if(workRequest.status!=="accepted"){
            return res.status(400).json({ message: "Work request is not accepted"})
        }

        if (!workRequest.isWorkDone){
            return res.status(400).json({ message: "Work request not completed"})
        }

        workRequest.isWorkDoneVerifiedByUser = true
        await workRequest.save()

        return res.status(200).json({ message: "Work request verified by user"})
    } catch (error) {
        next(error)
    }
}

export const vote = async (req,res,next) => {
    try {
        const { user } = req
        const { vendorId } = req.params
        const { method } = req.body

        if (!vendorId || !method){
            return res.status(400).json({ message: "Missing required fields"})
        }

        if(!["like","dislike"].includes(method)){
            return res.status(400).json({ message: "Invalid method"})
        }

        const vendor = await Vendors.findById(vendorId)

        if(!vendor){
            return res.status(404).json({ message: "Vendor not found"})
        
        }

        const workrequests = await WorkRequest.find({ requestedTo: vendor.userId , requestedBy: user._id , status: "accepted" , isWorkDone: true , isWorkDoneVerifiedByUser: true })

        if ( workrequests.length === 0 ){
            return res.status(400).json({ message: "You are not a customer of the vendor"})
        }

        if (method === "like"){
            if( vendor.upVotedBy.some( id => id.toString() === user._id.toString())){
                vendor.upVotedBy.pull(user._id)
            }
            else{
                if( vendor.downVotedBy.some( id => id.toString() === user._id.toString())){
                    vendor.downVotedBy.pull(user._id)
                }
                vendor.upVotedBy.push(user._id)
            }
        }
        else if (method === "dislike"){
            if( vendor.downVotedBy.some( id => id.toString() === user._id.toString())){
                vendor.downVotedBy.pull(user._id)
            }
            else{
                if( vendor.upVotedBy.some( id => id.toString() === user._id.toString())){
                    vendor.upVotedBy.pull(user._id)
                }
                vendor.downVotedBy.push(user._id)
            }
        }

        await vendor.save()

        return res.status(200).json({ message: "Voted successfully"})     
    } catch (error) {
        next(error)
    }
}