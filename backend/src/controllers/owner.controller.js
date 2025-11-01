import Societies from "../models/society.model.js";
import User from "../models/user.model.js";
import Admins from "../models/admin.model.js";
import { redis } from "../lib/redis.js";

export const giveAdminAccess = async (req,res,next) => {
    try {
        const { user } = req
        const { societyId , targetedUserId} = req.params  

        if(!societyId || !targetedUserId){
            return res.status(400).json({ message: "Society Id and User id is required"})
        }

        if ( user.role !== "Owner"){
            return res.status(403).json({ message: "You are not an owner "})
        }

        const society = await Societies.findById(societyId)

        if(!society){
            return res.status(404).json({ message: "Society not found"})
        }

        if(!society.owner.equals(user._id)){
            return res.status(403).json({ message: "You are not the owner of this society"})
        }

        const targetedUser = await User.findById(targetedUserId)

        if(!targetedUser){
            return res.status(404).json({ message: "User doesnt exist"})
        }

        
        if ( ! society.members.some( id => id.toString() === targetedUser._id.toString()) || society.admins.some( id => id.toString() === targetedUser._id.toString() ) ){
            return res.status(400).json({ message: "Targeted user is either not a member or already an admin"})
        }


        targetedUser.role = "Admin"
        const adminRole = new Admins({
            societyId,
            userId:targetedUser._id,
        })

        const savedAdmin = await adminRole.save()

        targetedUser.userType = savedAdmin._id
        society.members.pull(targetedUser._id)
        society.admins.push(targetedUser._id)
        society.memberCount -= 1

        await targetedUser.save()
        await society.save()

        await redis.del(`Society:${society._id}`)
        
        return res.status(200).json({ message: "Gave admin access to user"})
    } catch (error) {
        next(error)
    }
}

export const takeAdminAccess = async (req,res,next) => {
    try {
        const { user } = req
        const { societyId , targetedUserId} = req.params  

        if(!societyId || !targetedUserId){
            return res.status(400).json({ message: "Society Id and User id is required"})
        }

        if ( user.role !== "Owner"){
            return res.status(403).json({ message: "You are not an owner "})
        }

        const society = await Societies.findById(societyId)

        if(!society){
            return res.status(404).json({ message: "Society not found"})
        }

        if(!society.owner.equals(user._id)){
            return res.status(403).json({ message: "You are not the owner of this society"})
        }

        const targetedUser = await User.findById(targetedUserId)

        if(!targetedUser){
            return res.status(404).json({ message: "User doesnt exist"})
        }

        if ( society.members.some( id => id.toString() === targetedUser._id.toString()) || !society.admins.some( id => id.toString() === targetedUser._id.toString() ) ){
            return res.status(400).json({ message: "Targeted user is either not a admin or already an member"})
        }

        await Admins.deleteOne({userId:targetedUser._id})

        targetedUser.role = "User"
        targetedUser.userType = null // later have user preference id which will be set in the creation
        
        society.admins.pull(targetedUser._id)
        society.members.push(targetedUser._id)
        society.memberCount += 1

        await targetedUser.save()
        await society.save()

        await redis.del(`Society:${society._id}`)
        
        return res.status(200).json({ message: "Took admin access to user"})
    } catch (error) {
        next(error)
    }
}

export const seeAllMembers = async (req,res,next) => {
    try {
        const { user } = req
        const { societyId } = req.params  

        if(!societyId ){
            return res.status(400).json({ message: "Society Id is required"})
        }

        if ( user.role !== "Owner"){
            return res.status(403).json({ message: "You are not an owner "})
        }

        const society = await Societies.findById(societyId).populate("members","name email mobileNumber isMobileNumberVerified role profilePic")

        if(!society){
            return res.status(404).json({ message: "Society not found"})
        }

        if(!society.owner.equals(user._id)){
            return res.status(403).json({ message: "You are not the owner of this society"})
        }

        const societyMembers = society.members

        if( societyMembers.length === 0 ){
            return res.status(200).json({ message: "You have no society members"})
        }

        return res.status(200).json({ societyMembers })
    } catch (error) {
        next(error)
    }
}

export const seeAllAdmins = async (req,res,next) => {
    try {
        const { user } = req
        const { societyId } = req.params  

        if(!societyId ){
            return res.status(400).json({ message: "Society Id is required"})
        }

        if ( user.role !== "Owner"){
            return res.status(403).json({ message: "You are not an owner "})
        }

        const society = await Societies.findById(societyId)
        .populate({
                    path: "admins",
                    select: "name email mobileNumber isMobileNumberVerified role profilePic userType",
                    populate: { path: "userType" }
                })


        if(!society){
            return res.status(404).json({ message: "Society not found"})
        }

        if(!society.owner.equals(user._id)){
            return res.status(403).json({ message: "You are not the owner of this society"})
        }

        const societyAdmins = society.admins

        if( societyAdmins.length === 0 ){
            return res.status(200).json({ message: "You have no society admins"})
        }

        return res.status(200).json({ societyAdmins })
    } catch (error) {
        next(error)
    }
}

