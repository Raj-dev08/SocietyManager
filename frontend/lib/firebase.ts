import messaging from "@react-native-firebase/messaging";

export const getFcmToken = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.log("Notification permission not granted");
    return null;
  }

  const fcmToken = await messaging().getToken();
  console.log("FCM Token:", fcmToken);
  return fcmToken;
};
