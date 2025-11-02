import admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
//TO-DO : Add screen based notification so u can go to the page but overkill for prototype
export const sendNotificationToFCM = async (token, payload) => {
  try {
    await admin.messaging().send({
        token,
        notification: {
            title: payload.title,
            body: payload.body,
        },
        android: {
            priority: 'high',
            notification: {
                channelId: 'default',
            },
        },
        apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default' } },
        },
    });
  } catch (err) {
    console.error("FCM error for token:", token, err);
  }
};
