import express from 'express';
import auth from '../../middlewares/auth.js';
import controller from './transactions.controller.js';

const { protect, restrictTo } = auth;
// Partner-facing routes, mounted at /api/v1/partners
const partnerRouter = express.Router();
partnerRouter.use(protect, restrictTo('COLLECTION_PARTNER'));
partnerRouter.post('/transactions', controller.logTransactions);
partnerRouter.get('/history', controller.getPartnerHistory);

// Household-facing routes, mounted at /api/v1/households
const householdRouter = express.Router();

// Reference code lookup is performed BY a COLLECTION_PARTNER (looking up a
// household before logging a collection), even though the resource path
// lives under /households per the API contract. Registered before the
// blanket HOUSEHOLD-only middleware below so it gets its own role check.
householdRouter.get(
  '/lookup/:refCode',
  protect,
  restrictTo('COLLECTION_PARTNER'),
  controller.lookupHouseholdByReferenceCode
);

householdRouter.use(protect, restrictTo('HOUSEHOLD'));
householdRouter.patch('/transactions/:id/confirm', controller.confirmTransaction);
householdRouter.post('/transactions/:id/dispute', controller.disputeTransaction);
householdRouter.get('/history', controller.getHouseholdHistory);

export default { partnerRouter, householdRouter };
