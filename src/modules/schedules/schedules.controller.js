const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const schedulesService = require('./schedules.service');

// POST /api/v1/partners/prices
const publishPrice = asyncHandler(async (req, res) => {
  const price = await schedulesService.publishPrice(req.user.id, req.body);
  return sendSuccess(res, 200, 'Material buying price published successfully', price);
});

// GET /api/v1/households/prices
const listPricesForHouseholds = asyncHandler(async (req, res) => {
  const prices = await schedulesService.listPricesForHouseholds(req.query);
  return sendSuccess(res, 200, 'Buying prices fetched successfully', prices);
});

// POST /api/v1/partners/schedules
const publishSchedule = asyncHandler(async (req, res) => {
  const schedule = await schedulesService.publishSchedule(req.user.id, req.body);
  return sendSuccess(res, 201, 'Schedule published successfully', schedule);
});

// GET /api/v1/households/partners
const listPartnersForHouseholds = asyncHandler(async (req, res) => {
  const partners = await schedulesService.listPartnersForHouseholds(req.query);
  return sendSuccess(res, 200, 'Nearby partners fetched successfully', partners);
});

// GET /api/v1/partners/demand
const getAreaDemand = asyncHandler(async (req, res) => {
  const demand = await schedulesService.getAreaDemand(req.user.id, req.query);
  return sendSuccess(res, 200, 'Area demand fetched successfully', demand);
});

module.exports = {
  publishPrice,
  listPricesForHouseholds,
  publishSchedule,
  listPartnersForHouseholds,
  getAreaDemand,
};
