import transactionsService from './transactions.service.js';


export async function lookupHouseholdByReferenceCode(req, res) {
  try {
    const household = await transactionsService.lookupHouseholdByReferenceCode(req.params.refCode);
    return res.status(200).json({
      success: true,
      message: 'Household details found successfully',
      data: household,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to lookup household',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}

export async function logTransactions(req, res) {
  try {
    const created = await transactionsService.logTransactions(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: `${created.length} transaction(s) logged successfully`,
      data: created,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to log transaction(s)',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}

export async function confirmTransaction(req, res) {
  try {
    const result = await transactionsService.confirmTransaction(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Transaction confirmed by household successfully',
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to confirm transaction',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}

export async function disputeTransaction(req, res) {
  try {
    const result = await transactionsService.disputeTransaction(req.user.id, req.params.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Transaction flagged as disputed successfully',
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to flag dispute',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}

export async function getHouseholdHistory(req, res) {
  try {
    const history = await transactionsService.getHouseholdHistory(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Household transaction history fetched successfully',
      data: history,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch history',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}

export async function getPartnerHistory(req, res) {
  try {
    const history = await transactionsService.getPartnerHistory(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Partner transaction history fetched successfully',
      data: history,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch partner history',
      error: err.errorType || 'INTERNAL_SERVER_ERROR',
    });
  }
}
