import Events from "../models/events.model.js";
import Societies from "../models/society.model.js";
import { sendNotificationToFCM } from "../lib/fcm.js";
import { Webhook } from "svix";

export const notifyEvent = async (req, res , next) => {
  try {
        const svix_id = req.headers["svix-id"];
        const svix_timestamp = req.headers["svix-timestamp"];
        const svix_signature = req.headers["svix-signature"];

        if (!svix_id || !svix_timestamp || !svix_signature) {
        return res.status(400).json({ message: "Missing Svix headers" });
        }

        // Your QStash signing secret from dashboard
        const wh = new Webhook(process.env.QSTASH_CURRENT_SIGNING_KEY);

        const payload = req.body;
        const body = JSON.stringify(payload);

        // Verify the signature
        wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
        });
        
        const { eventId, type } = req.body;

        if (!eventId || !type) {
            return res.status(400).json({ message: "Invalid payload" });
        }

        const event = await Events.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        const society = await Societies.findById(event.societyId).populate("members");
        if (!society) return res.status(404).json({ message: "Society not found" });

        
        let message;
        if (type === "reminder_1day_before") {
            message = `Reminder: "${event.title}" is happening tomorrow!`;
        } else if (type === "reminder_on_theday") {
            message = `Today is the day! "${event.title}" is happening now 🎉`;
        } else {
            return res.status(400).json({ message: "Unknown reminder type" });
        }

        
        const sendPromises = society.members.map(async (member) => {
            if (member.fcmToken) {
                await sendNotificationToFCM(member.fcmToken, {
                    title: "Event Reminder",
                    body: message,
                });
            }
        });

        await Promise.all(sendPromises);

        return res.status(200).json({ success: true, message: "Notifications sent" });
  } catch (error) {
        next(error)
  }
};
