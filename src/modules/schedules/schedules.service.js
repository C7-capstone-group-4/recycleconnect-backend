import prisma from "../../config/db.js";

async function setPartnerPrice(userId, { category_id, price_per_kg }) {
  if (!category_id || price_per_kg === undefined) {
    const err = new Error("category_id and price_per_kg are required");
    err.statusCode = 400;
    err.errorType = "BAD_REQUEST";
    throw err;
  }

  if (Number(price_per_kg) <= 0) {
    const err = new Error("price_per_kg must be greater than 0");
    err.statusCode = 400;
    err.errorType = "BAD_REQUEST";
    throw err;
  }

  const partnerProfile = await prisma.collectionPartnerProfile.findUnique({
    where: { user_id: userId },
  });

  if (!partnerProfile) {
    const err = new Error("Collection Partner profile not found");
    err.statusCode = 404;
    err.errorType = "NOT_FOUND";
    throw err;
  }

  const category = await prisma.materialCategory.findUnique({
    where: { id: category_id },
  });

  if (!category) {
    const err = new Error("Material category not found");
    err.statusCode = 404;
    err.errorType = "NOT_FOUND";
    throw err;
  }

  const existingPrice = await prisma.partnerMaterialPrice.findFirst({
    where: {
      partner_id: partnerProfile.id,
      category_id: category_id,
    },
  });

  let price;
  if (existingPrice) {
    price = await prisma.partnerMaterialPrice.update({
      where: { id: existingPrice.id },
      data: { price_per_kg: parseFloat(price_per_kg) },
    });
  } else {
    price = await prisma.partnerMaterialPrice.create({
      data: {
        partner_id: partnerProfile.id,
        category_id: category_id,
        price_per_kg: parseFloat(price_per_kg),
      },
    });
  }

  return {
    partner_id: price.partner_id,
    category_id: price.category_id,
    price_per_kg: price.price_per_kg,
  };
}

async function publishSchedule(userId, { service_zone, service_area, collection_day, time_window }) {
  const targetArea = service_area || service_zone;

  if (!targetArea || !collection_day) {
    const err = new Error("service_area (or service_zone) and collection_day are required");
    err.statusCode = 400;
    err.errorType = "BAD_REQUEST";
    throw err;
  }

  const partnerProfile = await prisma.collectionPartnerProfile.findUnique({
    where: { user_id: userId },
  });

  if (!partnerProfile) {
    const err = new Error("Collection Partner profile not found");
    err.statusCode = 404;
    err.errorType = "NOT_FOUND";
    throw err;
  }

  const schedule = await prisma.partnerSchedule.create({
    data: {
      partner_id: partnerProfile.id,
      service_area: targetArea,
      collection_day: collection_day,
      time_window: time_window || null,
    },
  });

  return schedule;
}

async function browsePartnersByZone(serviceZone) {
  const partners = await prisma.collectionPartnerProfile.findMany({
    where: { user: { status: "APPROVED" } },
    include: {
      prices: { include: { category: true } },
      schedules: true,
    },
  });

  const filtered = serviceZone
    ? partners.filter((p) => p.service_area === serviceZone || (p.service_zones || []).includes(serviceZone))
    : partners;

  return filtered.map((p) => ({
    id: p.id,
    business_name: p.business_name,
    badge_title: p.badge_title,
    address: p.address,
    landmark: p.landmark || null,
    dropoff_hours: p.dropoff_hours,
    schedules: p.schedules
      .filter((s) => !serviceZone || s.service_area === serviceZone)
      .map((s) => ({
        collection_day: s.collection_day,
        time_window: s.time_window,
      })),
    prices: p.prices.map((pr) => ({
      category_name: pr.category.name,
      price_per_kg: pr.price_per_kg,
    })),
  }));
}

export default { setPartnerPrice, publishSchedule, browsePartnersByZone };