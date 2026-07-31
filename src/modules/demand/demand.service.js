const prisma = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { notifyPartnerOfDemand } = require("../../utils/fcmNotifier");

/**
 * Household marks materials as READY for the next scheduled collection.
 * Business rule: a household cannot have two active (READY) declarations
 * to the same partner at once — must be confirmed or cancelled first.
 */
async function markReady(householdId, { partner_id, service_area, materials }) {
  if (!partner_id || !service_area) {
    throw new ApiError(
      400,
      "partner_id and service_area are required",
      "BAD_REQUEST",
    );
  }
  if (!Array.isArray(materials) || materials.length === 0) {
    throw new ApiError(
      400,
      "materials must be a non-empty array",
      "BAD_REQUEST",
    );
  }

  const partner = await prisma.collectionPartnerProfile.findUnique({
    where: { id: partner_id },
  });
  if (!partner) {
    throw new ApiError(404, "Collection partner not found", "NOT_FOUND");
  }

  const existing = await prisma.scheduledDeclaration.findFirst({
    where: {
      householdId,
      partnerId: partner_id,
      status: "READY",
    },
  });
  if (existing) {
    throw new ApiError(
      400,
      "You already have an active declaration with this partner",
      "DUPLICATE_DECLARATION",
    );
  }

  const declaration = await prisma.scheduledDeclaration.create({
    data: {
      householdId,
      partnerId: partner_id,
      serviceZone: service_area,
      materials,
      status: "READY",
    },
  });

  // Fire-and-forget push notification to the partner (non-blocking)
  notifyPartnerOfDemand(partner_id).catch(() => {});

  return {
    declaration_id: declaration.id,
    status: declaration.status,
  };
}

/**
 * Household cancels their own active declaration before collection day.
 */
async function cancelDeclaration(householdId, declarationId) {
  const declaration = await prisma.scheduledDeclaration.findUnique({
    where: { id: declarationId },
  });

  if (!declaration || declaration.householdId !== householdId) {
    throw new ApiError(404, "Declaration not found", "NOT_FOUND");
  }
  if (declaration.status !== "READY") {
    throw new ApiError(
      400,
      "Only READY declarations can be cancelled",
      "BAD_REQUEST",
    );
  }

  return prisma.scheduledDeclaration.update({
    where: { id: declarationId },
    data: { status: "CANCELLED" },
  });
}

/**
 * Partner views accumulated ready-household demand ahead of a collection trip,
 * scoped to their own service area(s).
 */
async function getPartnerDemand(partnerId, serviceZone) {
  const where = {
    partnerId,
    status: "READY",
    ...(serviceZone ? { serviceZone } : {}),
  };

  const declarations = await prisma.scheduledDeclaration.findMany({
    where,
    include: {
      household: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const zone = serviceZone || (declarations[0]?.serviceZone ?? null);

  return {
    service_area: zone,
    ready_households_count: declarations.length,
    households: declarations.map((d) => ({
      declaration_id: d.id,
      reference_code: d.household.referenceCode,
      first_name: d.household.firstName,
      landmark: d.household.landmark || null,
      materials: d.materials,
    })),
  };
}

module.exports = {
  markReady,
  cancelDeclaration,
  getPartnerDemand,
};
