const prisma = require("../config/db");

// Firebase Admin SDK is initialized elsewhere in src/config/firebase.js (Package 1).
// This module assumes `admin` is available there; import lazily to avoid
// circular init issues if firebase isn't configured in dev.
let admin;
try {
  admin = require("../config/firebase");
} catch (_) {
  admin = null;
}

/**
 * Notifies a partner that a new household has marked materials ready
 * in one of their service zones. Best-effort — failures are swallowed
 * by the caller (demand.service.js) so they never block the API response.
 */
async function notifyPartnerOfDemand(partnerId) {
  if (!admin) return; // FCM not configured in this environment (e.g. dev/test)

  const partner = await prisma.collectionPartnerProfile.findUnique({
    where: { id: partnerId },
    include: { user: true },
  });

  if (!partner || !partner.user?.deviceToken) return;

  await admin.messaging().send({
    token: partner.user.deviceToken,
    notification: {
      title: "New collection demand",
      body: "A household in your service zone just marked materials ready.",
    },
  });
}

module.exports = { notifyPartnerOfDemand };
