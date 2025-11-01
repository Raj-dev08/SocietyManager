import Tasks from "../models/task.model.js";
import Admins from "../models/admin.model.js";
import { redis } from "../lib/redis.js";
import Societies from "../models/society.model.js";
import { isValidDate } from "./notice.controller.js";
import { sendNotificationToFCM } from "../lib/fcm.js";

const checkIfSocietyAdmin = async(societyId,userId) => {
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
        return false
    }

    if (!society.admins.some(id => id.toString() === userId.toString())){
        return false
    }

    return true
}

//we can  fetch all the admins from owner controller
export const assignTask = async (req,res,next) => {
    try {
        const { user } = req
        const { userId , societyId } = req.params
        const { taskName, taskDetails, date } = req.body 

        if(!taskName || !taskDetails){
            return res.status(400).json({ message: "Name and details is required"})
        }

        let deadLine = isValidDate(date) ? new Date(date) : new Date()

        if (!userId || !societyId ){
            return res.status(400).json({ message: "Need ids "})
        }

        if(user.role !== "Owner"){ // for future subscriptions
            return res.status(403).json({ message: "You are not a owner"})
        }

        const isSocietyAdmin = await checkIfSocietyAdmin(societyId,userId)

        if(!isSocietyAdmin){
            return res.status(400).json({ message: "User is not associated wiht society admins"})
        }

        const admin = await Admins.findOne({ societyId, userId , isActive: true})

        if(!admin){
            return res.status(404).json({ message: "No actiev admin not available"})
        }

        const newTask = new Tasks({
            societyId,
            givenBy: user._id,
            assignedTo: userId,
            taskName,
            taskDetails,
            deadLine
        })

        const savedTask = await newTask.save()

        admin.tasks.push(savedTask._id)

        await admin.save()

        await redis.del(`All-tasks:${userId}from:${societyId}`)

        return res.status(200).json({ message: "Successfully assigned task"})
    } catch (error) {
        next(error)
    }
}

export const getAllMyPendingTasks = async (req,res,next) => {
    try {
        const { user } = req
        const { societyId } = req.params
        
        if(!societyId) {
            return res.status(400).json({ message: "Id is required"})
        }

        const isSocietyAdmin = await checkIfSocietyAdmin(societyId,user._id)

        if(!isSocietyAdmin){
            return res.status(400).json({ message: "User is not associated wiht society admins"})
        }

        const cacheKey = `All-tasks:${user._id}from:${societyId}`
        const cachedTasks = await redis.get(cacheKey)
        if(cachedTasks){
            return res.status(200).json({ tasks: JSON.parse(cachedTasks) })
        }

        const tasks = await Tasks.find({ societyId, assignedTo: user._id , verifiedByOwner: false}).sort({ deadLine: -1})

        if(tasks.length === 0){
            return res.status(200).json({ message: "No pending tasks"})
        }

        await redis.set(cacheKey, JSON.stringify(tasks),"EX", 60 * 60 * 24 )

        return res.status(200).json({ tasks })
    } catch (error) {
        next(error)
    }
}

export const getAllMyTasks = async (req,res,next) => {
    try {
        const { user } = req

        if ( user.role !== "Admin"){
            return res.status(403).json({ message: "Only for admins"})
        }

        await user.userType.populate("tasks")

        const tasks = user.userType.tasks

        return res.status(200).json({ tasks })
    } catch (error) {
        next(error)
    }
}

export const completeTask = async (req,res,next) => {
    try {
        const { user } = req
        const { taskId } = req.params

        if (!taskId){
            return res.status(400).json({ message: "Task id is required"})
        }

        if(user.role !== "Admin"){
            return res.status(403).json({ message: "Admin only"})
        }

        const task = await Tasks.findById(taskId).populate("givenBy","fcmToken")

        if(!task){
            return res.status(404).json({ message: "Task not found"})
        }

        if(!task.assignedTo.equals(user._id)){
            return res.status(403).json({ message: "Task not assigned to u"})
        }

        task.isDone = true 
        await task.save()

        if(task.givenBy.fcmToken){
            await sendNotificationToFCM(task.givenBy.fcmToken,{
                title: "Admin completed the task",
                body: `Admin ${user.name} completed the task ${task.taskName}`
            })
        }

        await redis.del(`All-tasks:${user._id}from:${task.societyId}`)
        return res.status(200).json({ message: "Successfully marked as Done"})
    } catch (error) {
        next(error)
    }
}

export const verifiedByOwner = async (req,res,next) => {
    try {
        const { user } = req
        const { taskId } = req.params

        if (!taskId){
            return res.status(400).json({ message: "Task id is required"})
        }

        if(user.role !== "Owner"){
            return res.status(403).json({ message: "Owner only"})
        }

        const task = await Tasks.findById(taskId).populate("assignedTo","_id fcmToken")

        if(!task){
            return res.status(404).json({ message: "Task not found"})
        }

        if(!task.givenBy.equals(user._id)){
            return res.status(403).json({ message: "Task not given by u"})
        }
        
        if(!task.isDone){
            return res.status(400).json({ message: "Task is not done"})
        }

        const admin = await Admins.findOne({ societyId: task.societyId, userId: task.assignedTo._id}) // dont need isActive to verify

        if(!admin){
            return res.status(400).json({ message: "Admin not found"})
        }

        admin.adminCredits += 1
        task.verifiedByOwner = true 
        await task.save()
        await admin.save()

        if(task.assignedTo.fcmToken){
            await sendNotificationToFCM(task.assignedTo.fcmToken,{
                title: "Owner verified the task",
                body: `Owner ${user.name} verified the task ${task.taskName}`
            })
        }

        await redis.del(`All-tasks:${task.assignedTo._id}from:${task.societyId}`)
        return res.status(200).json({ message: "Successfully marked as Done"})
    } catch (error) {
        next(error)
    }
}

export const deactivateAdmin = async (req,res,next) => {
    try {
        const { user } = req
        
        if( user.role !== "Admin"){
            return res.status(403).json({ message: "Only for admins"})
        }

        user.userType.isActive = false
        await user.userType.save()

        return res.status(200).json({ message: "Deactivated admin account"})
    } catch (error) {
        next(error)
    }
}

export const ActivateAdmin = async (req,res,next) => {
    try {
        const { user } = req
        
        if( user.role !== "Admin"){
            return res.status(403).json({ message: "Only for admins"})
        }

        user.userType.isActive = true
        await user.userType.save()

        return res.status(200).json({ message: "Activated admin account"})
    } catch (error) {
        next(error)
    }
}
