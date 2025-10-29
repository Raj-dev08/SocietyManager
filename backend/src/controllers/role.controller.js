import User from "../models/user.model.js";
import Owners from "../models/owner.model.js";


export const giveOwnerPermission = async (req,res,next) => {
    try {
        const { user } = req
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json({ message: "User id is needed"})
        }

        if(!user.isSysAdmin){
            return res.status(403).json({ message: "You dont have the required permission"})
        }

        const targetUser = await User.findById(userId)

        if(!targetUser){
            return res.status(404).json({ message: "User not found"})
        }

        if ( targetUser.role === "Owner"){
            return res.status(400).json({ message: "Targeted user is already an owner"})
        }

        targetUser.role = "Owner"

        const owner = new Owners({
            userId
        })
        const savedOwner = await owner.save()

        targetUser.userType = savedOwner._id
        await targetUser.save()

        return res.status(200).json({ message: "Successfully gave owner permission"})
    } catch (error) {
        next(error)
    }
}

export const findForUser = async (req,res,next) => {
    try {
        const { user } = req

        if(!user.isSysAdmin){
            return res.status(403).json({ message: "You dont have the required permission"})
        }
        
        const { email } = req.body

        if(!email){
            return res.status(400).json({ message: "Email is required"})
        }

        const targetUser = await User.findOne({ email })

        if( !targetUser ){
            return res.status(401).json({ message: "User not found"})
        }

        return res.status(200).json({ targetUser })
    } catch (error) {
        next(error)
    }
}

export const revokeOwnerPermission = async (req,res,next) => {
    try {
        const { user } = req
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json({ message: "User id is needed"})
        }

        if(!user.isSysAdmin){
            return res.status(403).json({ message: "You dont have the required permission"})
        }

        const targetUser = await User.findById(userId)

        if(!targetUser){
            return res.status(404).json({ message: "User not found"})
        }

        if ( targetUser.role !== "Owner"){
            return res.status(400).json({ message: "Targeted user is not an owner"})
        }

        targetUser.role = "User"

        await Owners.deleteOne({userId})
        targetUser.userType = null
        await targetUser.save()

        return res.status(200).json({ message: "Successfully revoked owner permission"})
    } catch (error) {
        next(error)
    }
}