import schedulesService from "./schedules.service";
import { successResponse } from "../../utils/responseHelpers.js";

/**
 * POST /api/v1/partners/prices
 * Role: COLLECTION_PARTNER
 */
async function setPartnerPrice(req, res, next) {
  try {
    const partnerId = req.user.partnerProfileId; // attached by auth middleware
    const result = await schedulesService.setPartnerPrice(partnerId, req.body);
    return successResponse(res, 200, "Buying price published successfully", result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/partners/schedules
 * Role: COLLECTION_PARTNER
 */
async function publishSchedule(req, res, next) {
  try {
    const partnerId = req.user.partnerProfileId;
    await schedulesService.publishSchedule(partnerId, req.body);
    return successResponse(res, 201, "Schedule published successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/households/partners?service_zone=Ikeja Zone A
 * Role: HOUSEHOLD
 */
async function browsePartners(req, res, next) {
  try {
    const { service_zone } = req.query;
    const partners = await schedulesService.browsePartnersByZone(service_zone);
    return successResponse(res, 200, "Partners retrieved successfully", partners);
  } catch (err) {
    next(err);
  }
}

export {
  setPartnerPrice,
  publishSchedule,
  browsePartners,
};
