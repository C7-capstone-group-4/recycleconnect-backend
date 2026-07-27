const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth');
const controller = require('./transactions.controller');

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

module.exports = { partnerRouter, householdRouter };
