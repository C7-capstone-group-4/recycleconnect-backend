import express from 'express';
import auth from '../../middlewares/auth.js';
import controller from './schedules.controller.js';

const { protect, restrictTo } = auth;



// Partner-facing routes, mounted at /api/v1/partners
const partnerRouter = express.Router();
partnerRouter.use(protect, restrictTo('COLLECTION_PARTNER'));
partnerRouter.post('/prices', controller.publishPrice);
partnerRouter.post('/schedules', controller.publishSchedule);
partnerRouter.get('/demand', controller.getAreaDemand);

// Household-facing routes, mounted at /api/v1/households
const householdRouter = express.Router();
householdRouter.use(protect, restrictTo('HOUSEHOLD'));
householdRouter.get('/prices', controller.listPricesForHouseholds);
householdRouter.get('/partners', controller.listPartnersForHouseholds);

export default { partnerRouter, householdRouter };
