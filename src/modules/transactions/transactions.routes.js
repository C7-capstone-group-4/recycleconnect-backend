import express from 'express';
import { protect, restrictTo } from '../../middlewares/auth.js';
import controller from './transactions.controller.js';

// Partner-facing routes, mounted at /api/v1/partners
const partnerRouter = express.Router();
partnerRouter.use(protect, restrictTo('COLLECTION_PARTNER'));
partnerRouter.post('/transactions', controller.logTransactions);
partnerRouter.get('/history', controller.getPartnerHistory);

// Household-facing routes, mounted at /api/v1/households
const householdRouter = express.Router();
householdRouter.use(protect, restrictTo('HOUSEHOLD'));
householdRouter.patch('/transactions/:id/confirm', controller.confirmTransaction);
householdRouter.get('/history', controller.getHouseholdHistory);

export default { partnerRouter, householdRouter };
