import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createItem, editItem, deleteItem, getItems, getItemDetails, getMyItems} from "../controllers/item.controller.js";

const router = Router()

router.post("/create", protectRoute, createItem)
router.patch("/edit/:itemId", protectRoute, editItem)
router.delete("/delete/:itemId", protectRoute, deleteItem)

router.get("/", getItems)
router.get("/:itemId", getItemDetails)
router.get("/my-items", protectRoute, getMyItems)


export default router;