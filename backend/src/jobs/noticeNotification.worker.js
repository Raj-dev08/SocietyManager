import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import Societies from '../models/society.model.js'

import { connectDB } from '../lib/db.js'

await connectDB();

const noticeWorker = new Worker("notice-queue", async (job) => {
    switch (job.name) {
        case "sendNoticeNotification":
            const { societyId, title, body } = job.data;
            const society = await Societies.findById(societyId).populate("members");

            if (!society) {
            console.error("Society not found:", societyId);
            return;
            }

            const members = society.members;

            const sendPromises = members.map(async (member) => {
                if (member.fcmToken) {
                    await sendNotificationToFCM(member.fcmToken, { title, body });
                }
            });

            await Promise.all(sendPromises);


            break;
    
        default:
            break;
    }
},{
    connection: redis
})

noticeWorker.on("completed", (job) => {
    console.log(`Job ${job.name} completed successfully`);
});

noticeWorker.on("failed", (job, err) => {
    console.error(`Job ${job.name} failed with error: ${err.message}`);
});