import schedulesService from "./schedules.service.js";

export async function setPartnerPrice(req, res) {
  try {
    const userId = req.user.id;
    const result = await schedulesService.setPartnerPrice(userId, req.body);
    return res.status(200).json({
      success: true,
      message: "Buying price published successfully",
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to set price",
      error: err.errorType || "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function publishSchedule(req, res) {
  try {
    const userId = req.user.id;
    const result = await schedulesService.publishSchedule(userId, req.body);
    return res.status(201).json({
      success: true,
      message: "Schedule published successfully",
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to publish schedule",
      error: err.errorType || "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function browsePartners(req, res) {
  try {
    const { service_zone } = req.query;
    const partners = await schedulesService.browsePartnersByZone(service_zone);
    return res.status(200).json({
      success: true,
      message: "Partners retrieved successfully",
      data: partners,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to browse partners",
      error: err.errorType || "INTERNAL_SERVER_ERROR",
    });
  }
}