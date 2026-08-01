import demandService from "./demand.service.js";

export async function markReady(req, res) {
  try {
    const userId = req.user.id;
    const result = await demandService.markReady(userId, req.body);
    return res.status(201).json({
      success: true,
      message: "Materials marked ready for upcoming scheduled collection",
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to mark materials as ready",
      error: err.errorType || "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function cancelDeclaration(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await demandService.cancelDeclaration(userId, id);
    return res.status(200).json({
      success: true,
      message: "Declaration cancelled successfully",
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to cancel declaration",
      error: err.errorType || "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function getPartnerDemand(req, res) {
  try {
    const userId = req.user.id;
    const { service_zone } = req.query;
    const result = await demandService.getPartnerDemand(userId, service_zone);
    return res.status(200).json({
      success: true,
      message: "Demand retrieved successfully",
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to retrieve demand",
      error: err.errorType || "INTERNAL_SERVER_ERROR",
    });
  }
}