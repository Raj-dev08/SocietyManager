import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import { connectDB } from "./lib/db.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { protectRoute } from "./middleware/auth.middleware.js";


import authRoutes from './routes/auth.routes.js'
import societyRoutes from './routes/society.routes.js'
import applicationRoutes from './routes/application.routes.js'
import complaintRoutes from './routes/complaint.routes.js'
import eventRoutes from './routes/event.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import noticeRoutes from './routes/notice.routes.js'
import visitRoutes from './routes/visit.routes.js'
import sysAdminRoutes from './routes/sysadmin.routes.js'
import ownerRoutes from './routes/owner.routes.js'
import taskRoutes from './routes/task.routes.js'
import staffRoutes from './routes/staff.routes.js'
import staffApplicationRoutes from './routes/staffapplication.routes.js'

const app = express(); 

dotenv.config();

const PORT = process.env.PORT;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/v0/auth",authRoutes)
app.use("/api/v0/society",societyRoutes)
app.use("/api/v0/application",applicationRoutes)
app.use("/api/v0/complaints",protectRoute, complaintRoutes)
app.use("/api/v0/events",protectRoute, eventRoutes)
app.use("/api/v0/notifications", notificationRoutes)
app.use("/api/v0/notice",protectRoute, noticeRoutes)
app.use("/api/v0/visit",protectRoute, visitRoutes)
app.use("/api/v0/sysAdmin",protectRoute, sysAdminRoutes)
app.use("/api/v0/ownerAccess",protectRoute, ownerRoutes)
app.use("/api/v0/task",protectRoute, taskRoutes)
app.use("/api/v0/staff",protectRoute, staffRoutes)
app.use("/api/v0/staffApplication",protectRoute, staffApplicationRoutes)

app.use(errorHandler)


app.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});