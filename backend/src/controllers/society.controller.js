import Societies from "../models/society.model.js";
import User from "../models/user.model.js";
import Application from "../models/application.model.js";
import Complaints from "../models/complaints.model.js";
import Notices from "../models/notice.model.js";
import Events from "../models/events.model.js";
import cloudinary from "../lib/cloudinary.js";
import { redis } from "../lib/redis.js";

export const createSociety = async (req,res,next) => {
    try {
        const { user } = req

        if ( user.role !== "Owner"){
            return res.status(400).json({ message: "You are not a owner"})
        }

        const { name , description , lat , lng , locationName , landMark , imageArray } = req.body;

        if (!name || !lat || !lng || !locationName ){
            return res.status(400).json({ message: "Missing required fields" })
        }

        if ( imageArray && imageArray.length > 5 ){
            return res.status(400).json({ message: "Too many images"})
        }

        let uploadedImages = [];

        if (imageArray && imageArray.length > 0) {
          const uploads = await Promise.allSettled(
              imageArray.map(img => cloudinary.uploader.upload(img))
          );//making sure not the whole thing crashes for 1 image fail

          uploadedImages = uploads
              .filter(r => r.status === "fulfilled")
              .map(r => r.value.secure_url);
        }

        const newSociety = new Societies({
            name,
            description,
            owner: user._id,
            lat,
            lng,
            locationName,
            landMark,
            images:  uploadedImages.length > 0 ? uploadedImages : []
        })

        const savedSociety = await newSociety.save()

        await redis.set(`Society:${savedSociety._id}`, JSON.stringify(savedSociety), "EX" , 60 * 60 * 24 ) // save society details

        return res.status(201).json({ message: "Society created successfully", society: savedSociety })
    } catch (error) {
        next(error)
    }
}

export const editSociety = async (req, res, next) => {
  try {
    const { user } = req;
    const  societyId  = req.params.id;
    const { name, description, lat, lng, locationName, landMark, imageArray } = req.body;

    if( !name && !description && !lat && !lng && !locationName && !landMark && !imageArray ){
        return res.status(400).json({ message: "Atleast one field is required for update"})
    }

    const society = await Societies.findById(societyId);
    if (!society) {
      return res.status(404).json({ message: "Society not found" });
    }

    // Only owner or admins can edit
    if (society.owner.toString() !== user._id.toString() && !society.admins.includes(user._id)) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description) updates.description = description ;
    if (lat) updates.lat = lat;
    if (lng) updates.lng = lng;
    if (locationName) updates.locationName = locationName;
    if (landMark) updates.landMark = landMark ;

    if (imageArray && imageArray.length > 0) {
      if (imageArray.length > 5) {
        return res.status(400).json({ message: "Too many images" });
      }
      const uploads = await Promise.allSettled(imageArray.map(img => cloudinary.uploader.upload(img)));
      updates.images = uploads
        .filter(r => r.status === "fulfilled")
        .map(r => r.value.secure_url);
    }

    const updatedSociety = await Societies.findByIdAndUpdate(societyId, updates, { new: true });

    await redis.set(`Society:${societyId}`, JSON.stringify(updatedSociety), "EX", 60 * 60 * 24);

    return res.status(200).json({ message: "Society updated successfully", society: updatedSociety });
  } catch (error) {
    next(error);
  }
};

export const deleteSociety = async (req,res,next) => {
    try {
        const { user } = req
        const societyId = req.params.id

        const society = await Societies.findById(societyId)

        if(!society){
            return res.status(404).json({ message: "Society not found"})
        }

        if ( society.owner.toString() !== user._id.toString()){
            return res.status(400).json({ message: "Only owners can delete it"})
        }

        await Societies.findByIdAndDelete(societyId)

        await User.updateMany(
          { societyId },
          { $unset: { societyId: "" } } // removes the field
        );

        await Application.deleteMany({
          appliedFor:societyId
        })

        await Complaints.deleteMany({societyId})

        await Events.deleteMany({societyId})

        await Notices.deleteMany({appliedFor:societyId})

        await redis.del(`Society:${societyId}`)

        return res.status(200).json({ message: "Society deleted successfully"})
    } catch (error) {
        next(error)
    }
}

export const getSocietyDetails = async (req,res,next) => {
    try {
        const societyId = req.params.id

        const cacheKey = `Society:${societyId}`
        const cachedResponse = await redis.get(cacheKey)

        if(cachedResponse){
            return res.status(200).json({ society: JSON.parse(cachedResponse)})
        }

        const society = await Societies.findById(societyId)

        if(!society){
            return res.status(404).json({message: "Society not found"})
        }

        await redis.set(cacheKey,JSON.stringify(society), "EX" , 60 * 60 * 24 )
        return res.status(200).json({ society })
    } catch (error) {
        next(error)
    }
}

export const getSocieties = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const sortBy = req.query.sort || undefined

    const cacheKey = `Societies:search=${search}:skip=${skip}:limit=${limit}`;
    const cachedResponse = await redis.get(cacheKey);
    if (cachedResponse) {
      return res.status(200).json(JSON.parse(cachedResponse));
    }

    let searchConditions = {};
    let sortCondition = {};

    if (sortBy) {
      const [field, orderStr] = sortBy.split(":");
      const order = Number(orderStr);
      if (![1, -1].includes(order)) {
        return res.status(400).json({ message: "Invalid sort order" });
      }
      const sortFields = ["memberCount","eventCount","adminCount","createdAt"]
      if (!sortFields.includes(field)) {
        return res.status(400).json({ message: "Invalid sort field" });
      }
      sortCondition[field] = order;
    } else {
      // Default sorting
      sortCondition = { createdAt: -1 };
    }
    

    if (search) {
      searchConditions.$text = { $search: search };
    }

    const societies = await Societies.find(searchConditions)
      .limit(limit)
      .skip(skip)
      .select("name description lat lng locationName landMark images members admins")
      .sort(sortCondition)
      .lean();

    const countSocieties = await Societies.countDocuments(searchConditions);
    const hasMore = countSocieties > skip + societies.length;

    await redis.set(cacheKey, JSON.stringify({ societies, hasMore }), "EX", 60 * 60 );

    return res.status(200).json({ societies, hasMore });
  } catch (error) {
    next(error);
  }
};

