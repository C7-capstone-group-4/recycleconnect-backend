import express from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import {
    publishPrice,
    listPricesForHouseholds,
    publishSchedule,
    listPartnersForHouseholds,
} from './schedules.controller.js';

// Partner-facing routes (Mounted at /api/v1/partners)
const partnerRouter = express.Router();
partnerRouter.post('/prices', protect, restrictTo('COLLECTION_PARTNER'), publishPrice);
partnerRouter.post('/schedules', protect, restrictTo('COLLECTION_PARTNER'), publishSchedule);

// Household-facing routes (Mounted at /api/v1/households)
const householdRouter = express.Router();
householdRouter.get('/prices', protect, restrictTo('HOUSEHOLD'), listPricesForHouseholds);
householdRouter.get('/partners', protect, restrictTo('HOUSEHOLD'), listPartnersForHouseholds);

export default { partnerRouter, householdRouter };
