const admin = require('../config/firebase');

/**
 * Sends a push notification to a single device.
 * @param {string} deviceToken - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 */
async function sendNotification(deviceToken, title, body) {
  if (!deviceToken) return null;

  const message = {
    token: deviceToken,
    notification: { title, body },
  };

  return admin.messaging().send(message);
}

module.exports = { sendNotification };
