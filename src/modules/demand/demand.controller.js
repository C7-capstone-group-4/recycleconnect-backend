const demandService = require("./demand.service");
const { successResponse } = require("../../utils/responseHelpers");

/**
 * POST /api/v1/households/declarations
 * Role: HOUSEHOLD
 */
async function markReady(req, res, next) {
  try {
    const householdId = req.user.householdProfileId; // attached by auth middleware
    const result = await demandService.markReady(householdId, req.body);
    return successResponse(
      res,
      201,
      "Materials marked ready for upcoming scheduled collection",
      result,
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/households/declarations/:id/cancel
 * Role: HOUSEHOLD
 */
async function cancelDeclaration(req, res, next) {
  try {
    const householdId = req.user.householdProfileId;
    const { id } = req.params;
    await demandService.cancelDeclaration(householdId, id);
    return successResponse(res, 200, "Declaration cancelled successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/partners/demand?service_zone=Ikeja Zone A
 * Role: COLLECTION_PARTNER
 */
async function getPartnerDemand(req, res, next) {
  try {
    const partnerId = req.user.partnerProfileId;
    const { service_zone } = req.query;
    const result = await demandService.getPartnerDemand(
      partnerId,
      service_zone,
    );
    return successResponse(res, 200, "Demand retrieved successfully", result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  markReady,
  cancelDeclaration,
  getPartnerDemand,
};
