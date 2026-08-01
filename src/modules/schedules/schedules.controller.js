import schedulesService from './schedules.service.js';


export async function publishPrice(req, res) {
  try {
    const price = await schedulesService.publishPrice(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Material buying price published successfully',
      data: price,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to publish price',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}

export async function listPricesForHouseholds(req, res) {
  try {
    const prices = await schedulesService.listPricesForHouseholds(req.query);
    return res.status(200).json({
      success: true,
      message: 'Buying prices fetched successfully',
      data: prices,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch prices',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}

export async function publishSchedule(req, res) {
  try {
    const schedule = await schedulesService.publishSchedule(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Schedule published successfully',
      data: schedule,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to publish schedule',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}

export async function listPartnersForHouseholds(req, res) {
  try {
    const partners = await schedulesService.listPartnersForHouseholds(req.query);
    return res.status(200).json({
      success: true,
      message: 'Nearby partners fetched successfully',
      data: partners,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch partners',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}

export async function getAreaDemand(req, res) {
  try {
    const demand = await schedulesService.getAreaDemand(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      message: 'Area demand fetched successfully',
      data: demand,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch demand',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}