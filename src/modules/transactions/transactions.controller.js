const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const transactionsService = require('./transactions.service');

// GET /api/v1/households/lookup/:refCode
const lookupHouseholdByReferenceCode = asyncHandler(async (req, res) => {
  const household = await transactionsService.lookupHouseholdByReferenceCode(req.params.refCode);
  return sendSuccess(res, 200, 'Household found', household);
});

// POST /api/v1/partners/transactions
const logTransactions = asyncHandler(async (req, res) => {
  const created = await transactionsService.logTransactions(req.user.id, req.body);
  return sendSuccess(res, 201, `${created.length} transaction(s) logged successfully`, created);
});

// PATCH /api/v1/households/transactions/:id/confirm
const confirmTransaction = asyncHandler(async (req, res) => {
  const result = await transactionsService.confirmTransaction(req.user.id, req.params.id);
  return sendSuccess(res, 200, 'Transaction confirmed by household', result);
});

// POST /api/v1/households/transactions/:id/dispute
const disputeTransaction = asyncHandler(async (req, res) => {
  const result = await transactionsService.disputeTransaction(req.user.id, req.params.id, req.body);
  return sendSuccess(res, 201, 'Transaction flagged as disputed', result);
});

// GET /api/v1/households/history
const getHouseholdHistory = asyncHandler(async (req, res) => {
  const history = await transactionsService.getHouseholdHistory(req.user.id);
  return sendSuccess(res, 200, 'Transaction history fetched successfully', history);
});

// GET /api/v1/partners/history
const getPartnerHistory = asyncHandler(async (req, res) => {
  const history = await transactionsService.getPartnerHistory(req.user.id);
  return sendSuccess(res, 200, 'Transaction history fetched successfully', history);
});

module.exports = {
  lookupHouseholdByReferenceCode,
  logTransactions,
  confirmTransaction,
  disputeTransaction,
  getHouseholdHistory,
  getPartnerHistory,
};
