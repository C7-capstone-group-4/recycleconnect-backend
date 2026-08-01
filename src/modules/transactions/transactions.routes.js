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
partnerRouter.post('/transactions', protect, restrictTo('COLLECTION_PARTNER'), logTransactions);
partnerRouter.get('/history', protect, restrictTo('COLLECTION_PARTNER'), getPartnerHistory);

const householdRouter = express.Router();
householdRouter.get('/lookup/:refCode', protect, restrictTo('COLLECTION_PARTNER'), lookupHouseholdByReferenceCode);
householdRouter.patch('/transactions/:id/confirm', protect, restrictTo('HOUSEHOLD'), confirmTransaction);
householdRouter.post('/transactions/:id/dispute', protect, restrictTo('HOUSEHOLD'), disputeTransaction);
householdRouter.get('/history', protect, restrictTo('HOUSEHOLD'), getHouseholdHistory);

export default { partnerRouter, householdRouter };
