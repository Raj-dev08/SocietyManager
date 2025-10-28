import { Queue } from "bullmq";
import { redis } from "./redis.js";

export const noticeQueue = new Queue("notice-queue",{
    connection: redis
})