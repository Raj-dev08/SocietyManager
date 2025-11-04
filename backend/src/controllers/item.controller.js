import Items from "../models/item.model.js";
import cloudinary from "../lib/cloudinary.js";
import { redis } from "../lib/redis.js";

export const createItem = async (req, res, next) => {
    try {
        const { user } = req
        const { name , description , image ,  price , category , lat , lng , locationName , landMark } = req.body

        if ( !name || !description || !image || !price || !category || !lat || !lng || !locationName ){
            return res.status(400).json({ message: "Missing required fields"})
        }

        if ( isNaN(price) ){
            return res.status(400).json({ message: "Invalid price format"})
        }

        if ( isNaN(lat) || isNaN(lng) ){
            return res.status(400).json({ message: "Invalid location format"})
        }

        if( image && image.length > 5 ){
            return res.status(400).json({ message: "Too many images"})
        }

        let uploadedImages = []

        if (image && image.length > 0) {
            const uploads = await Promise.allSettled(
                image.map(img => cloudinary.uploader.upload(img))
            );

            uploadedImages = uploads
                .filter(r => r.status === "fulfilled")
                .map(r => r.value.secure_url);
        }

        const item = new Items({
            name,
            description,
            image: uploadedImages.length > 0 ? uploadedImages : [],
            price,
            category,
            lat,
            lng,
            locationName,
            landMark,
            seller: user._id
        })

        const savedItem = await item.save()

        return res.status(201).json({ message: "Item created successfully", item: savedItem })
    } catch (error) {
        next(error)
    }
}

export const editItem = async (req, res, next) => {
    try {
        const { user } = req
        const { itemId } = req.params

        if(!itemId) return res.status(400).json({ message: "Item id is required"})

        const { name , description , image , price } = req.body

        if ( !name && !description && !image && !price ){
            return res.status(400).json({ message: "Atleast one field is required for update"})
        }
        const item = await Items.findById(itemId)

        if (!item){
            return res.status(404).json({ message: "Item not found"})
        }

        if ( item.seller.toString() !== user._id.toString() ){
            return res.status(403).json({ message: "Only seller can edit it"})
        }
        const updates = {}

        if(name) updates.name = name
        if(description) updates.description = description
        if(price && !isNaN(price) ) updates.price = price

        if ( image && image.length > 0 ){
            if ( image.length > 5  ){
                return res.status(400).json({ message: "Too many images"}) //or just silently trim the image but i chose clarity here
            }

            let uploadedImages = []

            const uploads = await Promise.allSettled(
                image.map(img => cloudinary.uploader.upload(img))
            )

            uploadedImages = uploads
                .filter(r => r.status === "fulfilled")
                .map(r => r.value.secure_url)

            updates.image = uploadedImages.length > 0 ? uploadedImages : []
        }

        const updatedItem = await Items.findByIdAndUpdate(itemId, updates, { new: true })

        await redis.set(`Item:${itemId}`, JSON.stringify(updatedItem), "EX", 60 * 60 * 24 )

        return res.status(200).json({ message: "Item updated successfully" , item: updatedItem})
    } catch (error) {
        next(error)
    }
}

export const deleteItem = async (req, res, next) => {
    try {
        const { user } = req
        const { itemId } = req.params

        if (!itemId){
            return res.status(400).json({ message: "Item id is required"})
        }

        const item = await Items.findById(itemId)
        
        if (!item){
            return res.status(404).json({ message: "Item not found"})
        }

        if(item.seller.toString() !== user._id.toString()){
            return res.status(403).json({ message: "Only seller can delete it"})
        }

        await Items.findByIdAndDelete(itemId)

        await redis.del(`Item:${itemId}`)

        return res.status(200).json({ message: "Item deleted successfully"})
    } catch (error) {
        next(error)
    }
}

export const getItems = async (req, res, next) => {
    try {
        const { lat , lng , locationName , maxDistanceKm , category , sort } = req.query


        if ( maxDistanceKm && isNaN(maxDistanceKm) ){
            return res.status(400).json({ message: "distance must be a number"})
        }

        if ( ( lat && isNaN(lat) ) || ( lng && isNaN(lng) ) ){
            return res.status(400).json({ message: "Invalid location format"})
        }

        if ( !lat && !lng && !locationName ){
            return res.status(400).json({ message: "Location is required"})
        }

        const latitude = parseFloat(lat)
        const longitude = parseFloat(lng)
        const maxDistance = parseFloat(maxDistanceKm)

        let items 
        let sortCondition = {}

        if (sort){
            const [field , orderStr ]= sort.split(":")
            const order = Number(orderStr)

            if (![1,-1].includes(order)){
                return res.status(400).json({ message: "Invalid sort order"})
            }

            if ( field !== "price" && field !== "createdAt"){
                return res.status(400).json({ message: "Invalid sort field"})
            }
            sortCondition[field] = order
        } else {
            sortCondition = { createdAt: -1 }
        }

        if ( lat && lng ){
            const match = { sold: false}
            if ( category ){
                match.category = { $regex: category, $options: "i" }
            }
            items = await Items.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [longitude, latitude] },
                        distanceField: "distance",
                        spherical: true,
                        maxDistance: maxDistanceKm ? maxDistance * 1000 : 10000
                    }
                },
                {
                    $match: match
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "seller",
                        foreignField: "_id",
                        as: "seller"
                    }
                },
                { $unwind: "$seller" },
                { $sort: sortCondition },
                {
                    $project: {
                        name: 1,
                        description: 1,
                        image: 1,
                        price: 1,
                        category: 1,
                        distance: 1,
                        locationName: 1,
                        landMark: 1,
                        "seller._id": 1,
                        "seller.name": 1,
                        "seller.email": 1,
                        "seller.profilePic": 1,
                        "seller.mobileNumber": 1,
                        "seller.isMobileNumberVerified": 1
                    }
                }
            ])
        } else if ( locationName) {
            const query = { 
                locationName: { $regex: locationName, $options: "i" },
                sold: false
            };
            
            if(category){
                query.category = { $regex: category, $options: "i" }
            }

            items = await Items.find(query).populate("seller","name email profilePic mobileNumber isMobileNumberVerified").sort(sortCondition);
        }
        

        if ( items.length === 0 ){
            return res.status(200).json({ message: "No items available near you , maybe increase the distance"})
        }

        return res.status(200).json({ items })
    } catch (error) {
        next(error)
    }
}

export const getItemDetails = async (req, res, next) => {
    try {
        const { itemId } = req.params

        if(!itemId){
            return res.status(400).json({ message: "Item id is required"})
        }

        const cacheKey = `Item:${itemId}`
        const cachedItem = await redis.get(cacheKey)

        if(cachedItem){
            return res.status(200).json({ item: JSON.parse(cachedItem)})
        }

        const item = await Items.findById(itemId).populate("seller","name email profilePic mobileNumber isMobileNumberVerified")

        if (!item){
            return res.status(404).json({ message: "Item not found"})
        }

        await redis.set(cacheKey, JSON.stringify(item), "EX", 60 * 60 * 24 )

        return res.status(200).json({ item })
    } catch (error) {
        next(error)
    }
}

//can add caching later 
export const getMyItems = async (req,res,next) => {
    try {
        const { user } = req

        const items = await Items.find({ seller: user._id }).sort({ createdAt: -1 })

        if ( items.length === 0 ){
            return res.status(200).json({ message: "No items found"})
        }
        return res.status(200).json({ items })
    } catch (error) {
        next(error)
    }
}