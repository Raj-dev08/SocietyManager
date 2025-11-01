import Events from "../models/events.model.js";
import Societies from "../models/society.model.js";
import cloudinary from "../lib/cloudinary.js";
import { redis } from "../lib/redis.js";
import { Client } from '@upstash/qstash'

const qstash = new Client({
  token: process.env.QSTASH_TOKEN
})

const URL = `${process.env.APP_URl}/api/v0/notifications/notify-event`

const deleteSocietyCache = async (societyId) => {
  await redis.del(`Society:${societyId}`);
  await redis.del(`AllEvents:${societyId}`);
};

const checkIfSocietyMembers = async (societyId,user) => {
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

    if (
        !society.members.some(id => id.toString() === user._id.toString()) &&
        !society.admins.some(id => id.toString() === user._id.toString()) &&
        society.owner.toString() !== user._id.toString()
    ) {
        return false
    }

    return true
}

const checkIfAdmin = async (societyId,user,event) => {
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

    if(!event.organisers.some(id => id.equals(user._id)) && society.owner.toString() !== user._id.toString()){
      return false
    }

    if (
        !society.admins.some(id => id.toString() === user._id.toString()) &&
        society.owner.toString() !== user._id.toString()
    ) {
        return false
    }

    return true
}


export const createEvent = async (req, res, next) => {
  try {
    const { user } = req;
    const {
      title,
      description,
      image,
      specialAttraction,
      specialGuests,
      dressCode,
      date,
      organisers
    } = req.body;
    const societyId = req.params.id

    if (!title || !description || !societyId || !date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const society = await Societies.findById(societyId)

    if(!society){
        return res.status(400).json({ message: "Society not found" })
    }

    if (!society.admins.some(id => id.equals(user._id)) && society.owner.toString() !== user._id.toString()){
        return res.status(401).json({ message: "You are not authorised with this society"})
    }

    const eventDate = new Date(date);

    if (isNaN(eventDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format!" });
    }

    if (eventDate < new Date()) {
        return res.status(400).json({ message: "Date cannot be in the past!" });
    }

    let uploadedImage = "";
    if (image) {
      const upload = await cloudinary.uploader.upload(image);
      uploadedImage = upload.secure_url;
    }

    let organisersPayload = [];

    if (organisers) {
        organisers.forEach((id) => {
            if (
                society.admins.some(a => a.toString() === id.toString()) ||
                society.owner.toString() === id.toString()
            ) {
                organisersPayload.push(id);
            }
        });
    }

    // Always include the creator
    organisersPayload.push(user._id);
    organisersPayload = [...new Set(organisersPayload)];
    

    const newEvent = new Events({
      title,
      description,
      societyId,
      organisers: organisersPayload,
      image: uploadedImage,
      specialAttraction,
      specialGuests,
      dressCode,
      date: eventDate,
    });

    const savedEvent = await newEvent.save();

    // Add event to society
    society.events.push(savedEvent._id);
    society.eventCount = society.events.length;
    await society.save();

    await deleteSocietyCache(societyId);

    const oneDayBefore = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    const onTheDay = new Date(eventDate.getTime());

    // Only schedule if date is in the future
    if (oneDayBefore > new Date()) {
      await qstash.publishJSON({
        url: URL,
        body: { eventId: savedEvent._id, type: "reminder_1day_before" },
        notBefore: oneDayBefore.toISOString(),
      });
    }

    await qstash.publishJSON({
      url: URL,
      body: { eventId: savedEvent._id, type: "reminder_on_theday" },
      notBefore: onTheDay.toISOString(),
    });

    return res.status(201).json({ message: "Event created successfully", event: savedEvent });
  } catch (error) {
    next(error);
  }
};


export const editEvent = async (req, res, next) => {
  try {
    const { user } = req
    const { eventId } = req.params
    const {
      title,
      description,
      image,
      specialAttraction,
      specialGuests,
      dressCode
    } = req.body

    if (!eventId){
      return res.status(400).json({ message: "Event id is missing"})
    }

    const event = await Events.findById(eventId)

    if(!event){
      return res.status(404).json({ message: "Event not found"})
    }

    const isAdmin = await checkIfAdmin(event.societyId,user,event)
    if (!isAdmin) return res.status(403).json({ message: "Unauthorized access"})

    if (title){
      event.title = title
    }
    if (description){
      event.description = description
    }
    if (image && image.trim()){
      const upload = await cloudinary.uploader.upload(image);
      event.image = upload.secure_url;
    }
    if (image && !image.trim()){
      event.image = ""
    }
    if (specialAttraction){
      event.specialAttraction = specialAttraction
    }
    if (specialGuests){
      event.specialGuests = specialGuests
    }
    if (dressCode){
      event.dressCode = dressCode
    }

    const updatedEvent = await event.save()

    await deleteSocietyCache(updatedEvent.societyId)
    await redis.del(`Event:${eventId}`)

    return res.status(200).json({ message: "Edited event" , event: updatedEvent})
  } catch (error) {
    next(error)
  }
}

export const deleteEvent = async (req, res, next) => {
  try {
    const { user } = req
    const { eventId } = req.params
    if (!eventId){
      return res.status(400).json({ message: "EventId is required"})
    }
    const event = await Events.findById(eventId)
    if(!event){
      return res.status(404).json({ message: "Event not found"})
    }
    const isAdmin = await checkIfAdmin(event.societyId,user,event)
    if(!isAdmin) return res.status(403).json({ message: "Unauthorized access"})

    await Events.findByIdAndDelete(eventId)

    await deleteSocietyCache(event.societyId)
    await redis.del(`Event:${eventId}`)

    return res.status(200).json({ message: "event deleted successfully"})
  } catch (error) {
    next(error)
  }
}

export const fetchAdmins = async (req,res,next) => {
    try {
        const { user } = req
        const societyId = req.params.id

        if (!societyId){
            return res.status(400).json({ message: "societyId missing" })
        }

        const society = await Societies.findById(societyId).populate("admins","_id name email profilePic mobileNumber")

        if (!society.admins.some(a => a._id.equals(user._id)) && society.owner.toString() !== user._id.toString()){
            return res.status(403).json({ message: "Unauthorized access" })
        }

        return res.status(200).json({ admins : society.admins})
    } catch (error) {
        next(error)
    }
}


export const getSocietyEvents = async (req, res, next) => {
  try {
    const { user } = req;
    const { societyId } = req.params;

    const isSocietyMember = await checkIfSocietyMembers(societyId,user)

    if(!isSocietyMember){
        return res.status(400).json({ message: "Not part of the society "})
    }

    const cacheKey = `AllEvents:${societyId}`;
    const cachedEvents = await redis.get(cacheKey);
    if (cachedEvents) {
      return res.status(200).json({ events: JSON.parse(cachedEvents) });
    }

    const events = await Events.find({ societyId })
      .populate("organisers", "name email profilePic")
      .sort({ date: -1 })
      .lean();

    await redis.set(cacheKey, JSON.stringify(events), "EX", 60 * 60 * 24);

    return res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
};


export const getEventDetails = async (req, res, next) => {
  try {
    const { user } = req;
    const { eventId } = req.params;

    const cachedEvent = await redis.get(`Event:${eventId}`);
    if (cachedEvent) {
      const event = JSON.parse(cachedEvent);
      const isSocietyMember = await checkIfSocietyMembers(event.societyId,user)

      if(!isSocietyMember){
        return res.status(400).json({ message: "Not part of the society "})
      }
      return res.status(200).json({ event });
    }

    const event = await Events.findById(eventId).populate("organisers", "name email profilePic").lean();
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isSocietyMember = await checkIfSocietyMembers(event.societyId,user)

    if(!isSocietyMember){
        return res.status(400).json({ message: "Not part of the society "})
    }

    await redis.set(`Event:${eventId}`, JSON.stringify(event), "EX", 60 * 60 * 24);

    return res.status(200).json({ event });
  } catch (error) {
    next(error);
  }
};
