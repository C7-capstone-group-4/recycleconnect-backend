import express from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import {
  lookupHouseholdByReferenceCode,
  logTransactions,
  confirmTransaction,
  disputeTransaction,
  getHouseholdHistory,
  getPartnerHistory,
} from './transactions.controller.js';


const partnerRouter = express.Router();
partnerRouter.use(protect, restrictTo('COLLECTION_PARTNER'));
partnerRouter.post('/transactions', logTransactions);
partnerRouter.get('/history', getPartnerHistory);

const householdRouter = express.Router();

// Reference code lookup is performed BY a COLLECTION_PARTNER
householdRouter.get('/lookup/:refCode', protect, restrictTo('COLLECTION_PARTNER'), lookupHouseholdByReferenceCode);

householdRouter.use(protect, restrictTo('HOUSEHOLD'));
householdRouter.patch('/transactions/:id/confirm', confirmTransaction);
householdRouter.post('/transactions/:id/dispute', disputeTransaction);
householdRouter.get('/history', getHouseholdHistory);

export default { partnerRouter, householdRouter };
