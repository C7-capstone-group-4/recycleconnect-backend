import express from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import {
  publishPrice,
  listPricesForHouseholds,
  publishSchedule,
  listPartnersForHouseholds,
  getAreaDemand,
} from './schedules.controller.js';


const partnerRouter = express.Router();
partnerRouter.use(protect, restrictTo('COLLECTION_PARTNER'));
partnerRouter.post('/prices', publishPrice);
partnerRouter.post('/schedules', publishSchedule);
partnerRouter.get('/demand', getAreaDemand);

const householdRouter = express.Router();
householdRouter.use(protect, restrictTo('HOUSEHOLD'));
householdRouter.get('/prices', listPricesForHouseholds);
householdRouter.get('/partners', listPartnersForHouseholds);

export default { partnerRouter, householdRouter };
