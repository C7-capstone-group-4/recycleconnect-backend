import prisma from '../config/db.js';


let admin;
try {
    const mod = await import('../config/firebase.js');
    admin = mod.default;
} catch (error) {
    admin = null;
}

/**
 * Sends a push notification to a single device token
 * @param {string} deviceToken - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 */
async function sendNotification(deviceToken, title, body) {
    if (!admin || !deviceToken) return null;

    try {
        const message = {
            token: deviceToken,
            notification: { title, body },
        };

        return await admin.messaging().send(message);
    } catch (error) {
        console.error('FCM Notification error:', error.message);
        return null;
    }
}

/**
 * Notifies a Collection Partner when new demand is declared in their zone
 * @param {string} partnerId - Collection Partner Profile ID
 */
async function notifyPartnerOfDemand(partnerId) {
    if (!admin || !partnerId) return;

    try {
        const partner = await prisma.collectionPartnerProfile.findUnique({
            where: { id: partnerId },
            include: { user: true },
        });

        // Fixed: Updated deviceToken (camelCase) to device_token (snake_case)
        if (!partner || !partner.user?.device_token) return;

        await admin.messaging().send({
            token: partner.user.device_token,
            notification: {
                title: 'New Collection Demand',
                body: 'A household in your service zone just marked materials ready.',
            },
        });
    } catch (error) {
        console.error('FCM Partner Demand Notification error:', error.message);
    }
}

export { sendNotification, notifyPartnerOfDemand };
