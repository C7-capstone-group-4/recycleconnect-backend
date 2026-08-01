import prisma from "../../config/db.js";

/**
 * Household marks materials ready
 */
async function markReady(userId, { partner_id, service_area, materials }) {
  if (!partner_id || !service_area) {
    const err = new Error("partner_id and service_area are required");
    err.statusCode = 400;
    err.errorType = "BAD_REQUEST";
    throw err;
  }

  if (!Array.isArray(materials) || materials.length === 0) {
    const err = new Error("materials must be a non-empty array");
    err.statusCode = 400;
    err.errorType = "BAD_REQUEST";
    throw err;
  }

  // Look up household profile
  const householdProfile = await prisma.householdProfile.findUnique({
    where: { user_id: userId },
  });

  if (!householdProfile) {
    const err = new Error("Household profile not found");
    err.statusCode = 404;
    err.errorType = "NOT_FOUND";
    throw err;
  }

  const partner = await prisma.collectionPartnerProfile.findUnique({
    where: { id: partner_id },
  });

  if (!partner) {
    const err = new Error("Collection partner not found");
    err.statusCode = 404;
    err.errorType = "NOT_FOUND";
    throw err;
  }

  // Check existing active declaration for this partner
  const existing = await prisma.scheduledDeclaration.findFirst({
    where: {
      household_id: householdProfile.id,
      partner_id: partner_id,
    },
  });

  if (existing) {
    const err = new Error("You already have an active declaration for this collection day.");
    err.statusCode = 400;
    err.errorType = "DUPLICATE_DECLARATION";
    throw err;
  }

  // Create active declaration
  const declaration = await prisma.scheduledDeclaration.create({
    data: {
      household_id: householdProfile.id,
      partner_id: partner_id,
      service_area: service_area,
      materials,
    },
  });

  return {
    declaration_id: declaration.id,
    status: "READY",
  };
}

/**
 * Cancel active declaration
 */
async function cancelDeclaration(userId, declarationId) {
  const householdProfile = await prisma.householdProfile.findUnique({
    where: { user_id: userId },
  });

  const declaration = await prisma.scheduledDeclaration.findUnique({
    where: { id: declarationId },
  });

  if (!declaration || declaration.household_id !== householdProfile?.id) {
    const err = new Error("Declaration not found");
    err.statusCode = 404;
    err.errorType = "NOT_FOUND";
    throw err;
  }

  // Remove the declaration row when cancelled
  return prisma.scheduledDeclaration.delete({
    where: { id: declarationId },
  });
}

/**
 * Partner views accumulated area demand (US-C6)
 */
async function getPartnerDemand(userId, serviceZone) {
  const partnerProfile = await prisma.collectionPartnerProfile.findUnique({
    where: { user_id: userId },
  });

  if (!partnerProfile) {
    const err = new Error("Collection Partner profile not found");
    err.statusCode = 404;
    err.errorType = "NOT_FOUND";
    throw err;
  }

  const zone = serviceZone || partnerProfile.service_area;

  const declarations = await prisma.scheduledDeclaration.findMany({
    where: {
      partner_id: partnerProfile.id,
      ...(zone && { service_area: zone }),
    },
    include: { household: true },
    orderBy: { created_at: "asc" },
  });

  return {
    service_area: zone,
    ready_households_count: declarations.length,
    households: declarations.map((d) => ({
      declaration_id: d.id,
      reference_code: d.household.reference_code,
      first_name: d.household.first_name,
      landmark: d.household.landmark || null,
      materials: d.materials,
    })),
  };
}

export default { markReady, cancelDeclaration, getPartnerDemand };