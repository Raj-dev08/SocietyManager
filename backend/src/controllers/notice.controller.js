import Notices from "../models/notice.model.js";
import Societies from "../models/society.model.js";
import { redis } from "../lib/redis.js";

// Helper to delete society-related cache
const deleteSocietyCache = async (societyId) => {
  await redis.del(`Society:${societyId}`);
  await redis.del(`Notices:${societyId}`);
};

const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}


// Helper to check if user is a society member
const checkIfMember = async (societyId, user) => {
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

    if (  !society.members.map(id => id.toString()).includes(user._id.toString()) && 
            !society.admins.map(id => id.toString()).includes(user._id.toString()) &&
            society.owner.toString() !== user._id.toString()
    )
    {
        return false
    }

    return true
};

// Create a notice (admin only)
export const createNotice = async (req, res, next) => {
  try {
    const { user } = req;
    const { societyId } = req.params;
    const { header, description, type, inconvenience, fromDate, toDate, reason } = req.body;
    fromDate = isValidDate(fromDate) ? new Date(fromDate) : undefined
    toDate = isValidDate(toDate) ? new Date(toDate) : undefined


    if (!header || !description || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if ( ( fromDate || toDate ) && ! ( fromDate && toDate ) ){
        return res.status(400).json({ message: "Invalid date formats" })
    }

    if ( ( inconvenience || reason ) && !(inconvenience && reason)){
        return res.status(400).json({ message: "Invalid inconvenience and reason format" })
    }

    if ( fromDate && toDate && ( fromDate.getTime() > toDate.getTime() ) ){       
        return res.status(400).json({ message: "Invalid dates" })
    }

    const society = await Societies.findById(societyId)

    if( !society ){
        return res.status(404).json({ message: "Society not found" })
    }

    if (  !society.admins.includes(user._id) && society.owner.toString() !== user._id.toString()){
        return res.status(401).json({ message: "You are not authorised"})
    }


    const newNotice = new Notices({
      header,
      description,
      type,
      inconvenience,
      fromDate,
      toDate,
      societyId,
      reason
    });

    const savedNotice = await newNotice.save();

    society.notices.push(savedNotice._id);
    await society.save();

    await deleteSocietyCache(societyId);

    return res.status(201).json({ message: "Notice created successfully", notice: savedNotice });
  } catch (error) {
    next(error);
  }
};

// Edit a notice (admin only)
export const editNotice = async (req, res, next) => {
  try {
    const { user } = req;
    const { noticeId } = req.params;
    const { header, description, type, inconvenience, fromDate, toDate, reason } = req.body;
    fromDate = isValidDate(fromDate) ? new Date(fromDate) : undefined
    toDate = isValidDate(toDate) ? new Date(toDate) : undefined

    const notice = await Notices.findById(noticeId);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    const society = await Societies.findById(notice.societyId);
    if (!society) return res.status(404).json({ message: "Society not found" });
    if (  !society.admins.includes(user._id) && society.owner.toString() !== user._id.toString()){
        return res.status(401).json({ message: "You are not authorised"})
    }
    
    if ( header ){
        notice.header = header
    }
    if ( description ){
        notice.description = description
    }
    if ( type ){
        notice.type = type
    }
    if( fromDate && toDate && ( fromDate.getTime() < toDate.getTime() ) ){
        notice.fromDate = fromDate
        notice.toDate = toDate
    }
    if( inconvenience && reason){
        notice.inconvenience = inconvenience
        notice.reason = reason
    }

    
    const updatedNotice = await notice.save();

    await deleteSocietyCache(society._id);
    await redis.set(`Notice:${noticeId}`,JSON.stringify(updatedNotice), "EX" , 60 * 60 * 24 )

    return res.status(200).json({ message: "Notice updated", notice: updatedNotice });
  } catch (error) {
    next(error);
  }
};

// Delete a notice (admin only)
export const deleteNotice = async (req, res, next) => {
  try {
    const { user } = req;
    const { noticeId } = req.params;

    const notice = await Notices.findById(noticeId);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    const society = await Societies.findById(notice.societyId);
    if (!society) return res.status(404).json({ message: "Society not found" });
    if (  !society.admins.includes(user._id) && society.owner.toString() !== user._id.toString()){
        return res.status(401).json({ message: "You are not authorised"})
    }

    await Notices.findByIdAndDelete(noticeId);

    society.notices.pull(noticeId);
    await society.save();

    await deleteSocietyCache(society._id);
    await redis.del(`Notice:${noticeId}`)

    return res.status(200).json({ message: "Notice deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Get all notices for a society (any member)
export const getSocietyNotices = async (req, res, next) => {
  try {
    const { user } = req;
    const { societyId } = req.params;

    const cacheKey = `Notices:${societyId}`;
    const cachedNotices = await redis.get(cacheKey);
    if (cachedNotices) return res.status(200).json({ notices: JSON.parse(cachedNotices) });

    const society = await Societies.findById(societyId).populate("notices")

    if(!society){
        return res.status(404).json({ message: "Society not found"})
    }

    if ( !society.members.includes(user._id) && !society.admins.includes(user._id) && ! society.owner.equals(user._id)){
        return res.status(403).json({ message: "You are not authorised with this society"})
    }

    const notices = society.notices

    await redis.set(cacheKey, JSON.stringify(notices), "EX", 60 * 60);

    return res.status(200).json({ notices });
  } catch (error) {
    next(error);
  }
};

// Get single notice details
export const getNoticeDetails = async (req, res, next) => {
  try {
    const { user } = req;
    const { noticeId } = req.params;

    const cacheKey = `Notice:${noticeId}`
    const cachedData = await redis.get(cacheKey)
    if ( cachedData ){
        return res.status(200).json({ notice: JSON.parse(cachedData) })
    }

    const notice = await Notices.findById(noticeId);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    const isMember = await checkIfMember(notice.societyId, user);
    if (!isMember) return res.status(403).json({ message: "Not part of the society" });

    await redis.set(cacheKey,JSON.stringify(notice), "EX" , 60 * 60 * 24 )

    return res.status(200).json({ notice });
  } catch (error) {
    next(error);
  }
};
