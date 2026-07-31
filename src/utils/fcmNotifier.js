import prisma from "../config/db.js";

let admin;
try {
  const mod = await import("../config/firebase.js");
  admin = mod.default;
} catch (_) {
  admin = null;
}

async function notifyPartnerOfDemand(partnerId) {
  if (!admin) return;

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

export { notifyPartnerOfDemand };
