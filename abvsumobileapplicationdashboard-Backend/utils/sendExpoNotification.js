const { Expo } = require("expo-server-sdk");
const expo = new Expo();

async function sendPushNotification(tokens=[], title, body, data={}){
  if(!Array.isArray(tokens)){
    tokens = [tokens]
  }
  const messages = tokens.filter(Expo.isExpoPushToken).map((token)=>({
    to: token,
    sound: "default",
    title,
    body,
    data
  }))
  try {
    const chunks = expo.chunkPushNotifications(messages)
    for(const chunk of chunks){
      await expo.sendPushNotificationsAsync(chunk)
    }
  } catch (error) {
    console.error("Notification error:", error)
  }
}

module.exports = sendPushNotification;