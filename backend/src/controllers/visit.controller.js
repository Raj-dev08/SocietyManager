import Societies from "../models/society.model.js";
import Visit from "../models/visit.model.js";
import User from "../models/user.model.js";
import { isValidDate } from "./notice.controller.js";
import { sendNotificationToFCM } from "../lib/fcm.js";
import { Client } from "@upstash/qstash";
import { Webhook } from "svix";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN
})

const URL = `${process.env.APP_URl}/api/v0` //will set later accordingly

export const createVisit = async (req,res,next) => {
    try {
        const { user } = req
        const { visitForId } = req.params

        const { date } = req.body

        if(!visitForId || !date ){
            return res.status(400).json({ message: "Insuffiecient data" })
        }

        if (!isValidDate(date)){
            return res.status(400).json({ message: "Not a date"})
        }

        const visitDate = new Date(date)

        if(visitDate.getTime() < ( new Date().getTime() + 24 * 60 * 60 * 1000 ) ){// so the resident have time to check
            return res.status(400).json({ message: "Date cant be in the past or in the same day"})
        }

        const visitTo = await User.findById(visitForId)
        
        if(!visitTo){
            return res.status(401).json({ message: "User not found"})
        }

        if ( !visitTo.societyId ){
            return res.status(400).json({ message: "Not any society member"})
        }

        const newVisit = new Visit({
            visitor: user._id,
            visitFor: visitForId,
            societyId: visitTo.societyId,
            date: visitDate
        })

        const savedVisit = await newVisit.save();

        const formattedDate = visitDate.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        });

        const message = `${user.name} has scheduled a visit with you on ${formattedDate}.`;

        if(visitTo.fcmToken){
            await sendNotificationToFCM(visitTo.fcmToken,{
                title:"New Visit Scheduled 🏠",
                body: message
            })
        }

        const oneDayAfter = new Date(visitDate.getTime() + 24 * 60 * 60 * 1000)

        await qstash.publishJSON({
            url: URL,
            body: { visitId: savedVisit._id },
            notBefore: oneDayAfter.toISOString(),
        });
            

        return res.status(201).json({message: "Visit scheduled successfully"})
    } catch (error) {
        next(error)
    }
}

// not using caching currently cuz its not something that u should check multiple times and u get notifications
export const getAllVisitsForMe = async (req,res,next) => { 
    try {
        const { user } = req

        const visits = await  Visit.find({ visitFor: user._id , status: "pending" }).populate("visitor").sort({ date: -1 })
        if( visits.length === 0 ){
            return res.status(200).json({ message: "No visits"})
        }
        
        return res.status(200).json({ visits })
    } catch (error) {
        next(error)
    }
}

export const acceptVisit = async (req,res,next) => {
    try {
        const { user } = req
        const { visitId } = req.params
        const { houseNo } =req.body

        if(!visitId || !houseNo ){
            return res.status(400).json({ message: "visitId and houseNo is needed"})
        }

        const visit = await Visit.findById(visitId).populate("visitor","fcmToken").populate("societyId")
        
        if (!visit){
            return res.status(404).json({ message: "visit not found"})
        }

        const society = visit.societyId
        const flat = society.flats.find( f => f.houseNo === houseNo )
        if(!flat){
            return res.status(404).json({ message: "flat with HouseNo  doesnt exist"})
        }

        

        visit.status = "accepted"
        visit.houseNo = houseNo
        society.scheduledVisit.push(visitId)
        await society.save()
        await visit.save()

        const formattedDate = visit.date.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        });

        const message = `${user.name} has accepted the visit with you on ${formattedDate}.`;


        if ( visit.visitor.fcmToken){
             await sendNotificationToFCM(visit.visitor.fcmToken,{
                title:"Visit accepted 🎉",
                body: message
            })
        }

        return res.status(200).json({ message: "Visit accepted successfully"})
    } catch (error) {
        next(error)
    }
}

export const rejectVisit = async (req,res,next) => {
    try {
        const { user } = req
        const { visitId } = req.params

        if(!visitId){
            return res.status(400).json({ message: "visitId is needed"})
        }

        const visit = await Visit.findById(visitId).populate("visitor","fcmToken")

        if (!visit){
            return res.status(404).json({ message: "visit not found"})
        }

        visit.status = "rejected"
        await visit.save()

        const formattedDate = visit.date.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        });

        const message = `${user.name} has rejected the visit with you on ${formattedDate}.`;


        if ( visit.visitor.fcmToken){
             await sendNotificationToFCM(visit.visitor.fcmToken,{
                title:"Visit rejected 😓",
                body: message
            })
        }

        return res.status(200).json({ message: "Visit rejected successfully"})
    } catch (error) {
        next(error)
    }
}

export const deleteVisits = async (req,res,next) => {
    try {
        const svix_id = req.headers["svix-id"];
        const svix_timestamp = req.headers["svix-timestamp"];
        const svix_signature = req.headers["svix-signature"];

        if (!svix_id || !svix_timestamp || !svix_signature) {
        return res.status(400).json({ message: "Missing Svix headers" });
        }

        // Your QStash signing secret from dashboard
        const wh = new Webhook(process.env.QSTASH_CURRENT_SIGNING_KEY);

        const payload = req.body;
        const body = JSON.stringify(payload);

        // Verify the signature
        wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
        });

        const { visitId } = req.body;

        // Find visits that are past their date + 1 day
        const expiredVisit = await Visit.findById(visitId).select(" _id societyId")

        if(!expiredVisit){
            return res.status(400).json({ success: false , message: "visit doesnt exist"})
        }    
        const society = await Societies.findById(expiredVisit.societyId)

        society.scheduledVisit.pull(expiredVisit._id)

        await society.save()
        await Visit.findByIdAndDelete(expiredVisit._id)

        return res.status(200).json({ success:true, message: "Expired visits cleaned"});
    } catch (error) {
        next(error)
    }
}