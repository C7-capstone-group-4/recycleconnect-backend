import prisma from '../../config/db.js';
import walletService from '../wallet/wallet.service.js';

const VALID_TRANSACTION_TYPES = ['SCHEDULED_COLLECTION', 'DROP_OFF'];
const VALID_SELLER_TYPES = ['REGISTERED_HOUSEHOLD', 'GENERAL_UNREGISTERED'];
const LOYALTY_POINTS_PER_NAIRA = 100; // +1 point per ₦100

async function getPartnerProfileOrThrow(userId) {
  const partner = await prisma.collectionPartnerProfile.findUnique({
    where: { user_id: userId },
  });
  if (!partner) {
    const err = new Error('Collection Partner profile not found for this user.');
    err.statusCode = 404;
    err.errorType = 'NOT_FOUND';
    throw err;
  }
  return partner;
}

async function getHouseholdProfileOrThrow(userId) {
  const household = await prisma.householdProfile.findUnique({
    where: { user_id: userId },
  });
  if (!household) {
    const err = new Error('Household profile not found for this user.');
    err.statusCode = 404;
    err.errorType = 'NOT_FOUND';
    throw err;
  }
  return household;
}

/**
 * GET /households/lookup/:refCode (US-H14, US-C7)
 */
async function lookupHouseholdByReferenceCode(refCode) {
  if (!refCode) {
    const err = new Error('Reference code is required.');
    err.statusCode = 400;
    err.errorType = 'BAD_REQUEST';
    throw err;
  }

  const household = await prisma.householdProfile.findUnique({
    where: { reference_code: refCode.toUpperCase() },
    select: { id: true, first_name: true, reference_code: true, service_zone: true },
  });

  if (!household) {
    const err = new Error('No household found for this reference code.');
    err.statusCode = 404;
    err.errorType = 'NOT_FOUND';
    throw err;
  }

  return {
    household_id: household.id,
    reference_code: household.reference_code,
    first_name: household.first_name,
    service_zone: household.service_zone,
  };
}

/**
 * Validate transaction payload
 */
function validateTransactionInput(payload) {
  const { seller_type, household_id, transaction_type, items } = payload;

  const sellerType = seller_type || 'REGISTERED_HOUSEHOLD';
  if (!VALID_SELLER_TYPES.includes(sellerType)) {
    const err = new Error(`seller_type must be one of: ${VALID_SELLER_TYPES.join(', ')}`);
    err.statusCode = 400;
    err.errorType = 'BAD_REQUEST';
    throw err;
  }
  if (sellerType === 'REGISTERED_HOUSEHOLD' && !household_id) {
    const err = new Error('household_id is required when seller_type is REGISTERED_HOUSEHOLD.');
    err.statusCode = 400;
    err.errorType = 'BAD_REQUEST';
    throw err;
  }
  if (!VALID_TRANSACTION_TYPES.includes(transaction_type)) {
    const err = new Error(`transaction_type must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`);
    err.statusCode = 400;
    err.errorType = 'BAD_REQUEST';
    throw err;
  }
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('items must be a non-empty array.');
    err.statusCode = 400;
    err.errorType = 'BAD_REQUEST';
    throw err;
  }

  return sellerType;
}

/**
 * Creates single transaction inside Prisma transaction client
 */
async function createSingleTransaction(tx, partner, payload) {
  const sellerType = validateTransactionInput(payload);
  const { household_id, transaction_type, items } = payload;

  let household = null;
  if (sellerType === 'REGISTERED_HOUSEHOLD') {
    household = await tx.householdProfile.findUnique({ where: { id: household_id } });
    if (!household) {
      const err = new Error(`Household profile not found for id: ${household_id}`);
      err.statusCode = 404;
      err.errorType = 'NOT_FOUND';
      throw err;
    }
  }

  const itemsWithSubtotals = items.map((item) => ({
    category_id: item.category_id,
    weight_kg: parseFloat(item.weight_kg),
    price_per_kg: parseFloat(item.price_per_kg),
    subtotal: Number(item.weight_kg) * Number(item.price_per_kg),
  }));

  const totalAmount = itemsWithSubtotals.reduce((sum, i) => sum + i.subtotal, 0);

  // FR-C13: Pre-fund balance validation for registered households
  if (sellerType === 'REGISTERED_HOUSEHOLD') {
    const partnerWallet = await walletService.getOrCreateWallet(tx, partner.user_id);
    if (Number(partnerWallet.balance) < totalAmount) {
      const err = new Error(`Insufficient pre-funded wallet balance to cover this household payout. Available: ₦${partnerWallet.balance}, Required: ₦${totalAmount}`);
      err.statusCode = 400;
      err.errorType = 'INSUFFICIENT_FUNDS';
      throw err;
    }
  }

  const transaction = await tx.collectionTransaction.create({
    data: {
      partner_id: partner.id,
      household_id: sellerType === 'REGISTERED_HOUSEHOLD' ? household_id : null,
      seller_type: sellerType,
      transaction_type: transaction_type,
      total_amount: totalAmount,
      status: sellerType === 'GENERAL_UNREGISTERED' ? 'CONFIRMED' : 'PENDING_CONFIRMATION',
      items: { create: itemsWithSubtotals },
    },
    include: { items: true, household: { include: { user: true } } },
  });

  return transaction;
}

/**
 * POST /partners/transactions (Single or Batch logging)
 */
async function logTransactions(userId, body) {
  const partner = await getPartnerProfileOrThrow(userId);
  const list = Array.isArray(body.transactions) ? body.transactions : [body];

  if (list.length === 0) {
    const err = new Error('At least one transaction is required.');
    err.statusCode = 400;
    err.errorType = 'BAD_REQUEST';
    throw err;
  }

  const results = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const txPayload of list) {
      const record = await createSingleTransaction(tx, partner, txPayload);
      created.push(record);
    }
    return created;
  });

  return results.map(formatTransaction);
}

function formatTransaction(t) {
  return {
    transaction_id: t.id,
    household_id: t.household_id,
    seller_type: t.seller_type,
    transaction_type: t.transaction_type,
    total_amount: Number(t.total_amount),
    status: t.status,
    logged_at: t.logged_at,
    items: t.items.map((i) => ({
      category_id: i.category_id,
      weight_kg: Number(i.weight_kg),
      price_per_kg: Number(i.price_per_kg),
      subtotal: Number(i.subtotal),
    })),
  };
}

/**
 * PATCH /households/transactions/:id/confirm
 */
async function confirmTransaction(userId, transactionId) {
  const household = await getHouseholdProfileOrThrow(userId);

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.collectionTransaction.findUnique({
      where: { id: transactionId },
      include: { partner: true },
    });

    if (!transaction) {
      const err = new Error('Transaction not found.');
      err.statusCode = 404;
      err.errorType = 'NOT_FOUND';
      throw err;
    }

    if (transaction.household_id !== household.id) {
      const err = new Error('You are not authorized to confirm this transaction.');
      err.statusCode = 403;
      err.errorType = 'FORBIDDEN';
      throw err;
    }

    if (transaction.status === 'CONFIRMED') {
      const err = new Error('This transaction has already been confirmed.');
      err.statusCode = 400;
      err.errorType = 'BAD_REQUEST';
      throw err;
    }

    if (transaction.status === 'DISPUTED') {
      const err = new Error('This transaction is under dispute and cannot be confirmed.');
      err.statusCode = 400;
      err.errorType = 'BAD_REQUEST';
      throw err;
    }

    const amount = Number(transaction.total_amount);

    // Debit partner, credit household wallet
    const partnerWallet = await walletService.getOrCreateWallet(tx, transaction.partner.user_id);
    await walletService.debitWallet(tx, partnerWallet.id, amount, 'HOUSEHOLD_PAYOUT');

    const householdWallet = await walletService.getOrCreateWallet(tx, userId);
    const updatedHouseholdWallet = await walletService.creditWallet(tx, householdWallet.id, amount, 'HOUSEHOLD_PAYOUT');

    // Award loyalty points (+1 per ₦100)
    const pointsAwarded = Math.floor(amount / LOYALTY_POINTS_PER_NAIRA);
    await tx.householdProfile.update({
      where: { id: household.id },
      data: { loyalty_points: { increment: pointsAwarded } },
    });

    // Mark completed
    const updatedTransaction = await tx.collectionTransaction.update({
      where: { id: transactionId },
      data: { status: 'CONFIRMED' },
    });

    return { updatedTransaction, pointsAwarded, newBalance: updatedHouseholdWallet.balance };
  });

  return {
    transaction_id: result.updatedTransaction.id,
    status: result.updatedTransaction.status,
    total_amount: Number(result.updatedTransaction.total_amount),
    loyalty_points_awarded: result.pointsAwarded,
    household_wallet_balance: Number(result.newBalance),
  };
}

/**
 * POST /households/transactions/:id/dispute
 */
async function disputeTransaction(userId, transactionId, { reason }) {
  if (!reason || !reason.trim()) {
    const err = new Error('A reason is required to flag a dispute.');
    err.statusCode = 400;
    err.errorType = 'BAD_REQUEST';
    throw err;
  }

  const household = await getHouseholdProfileOrThrow(userId);

  const transaction = await prisma.collectionTransaction.findUnique({ where: { id: transactionId } });
  if (!transaction) {
    const err = new Error('Transaction not found.');
    err.statusCode = 404;
    err.errorType = 'NOT_FOUND';
    throw err;
  }

  if (transaction.household_id !== household.id) {
    const err = new Error('You are not authorized to dispute this transaction.');
    err.statusCode = 403;
    err.errorType = 'FORBIDDEN';
    throw err;
  }

  if (transaction.status === 'CONFIRMED') {
    const err = new Error('A confirmed transaction cannot be disputed.');
    err.statusCode = 400;
    err.errorType = 'BAD_REQUEST';
    throw err;
  }

  const [, dispute] = await prisma.$transaction([
    prisma.collectionTransaction.update({
      where: { id: transactionId },
      data: { status: 'DISPUTED' },
    }),
    prisma.dispute.create({
      data: {
        transaction_id: transactionId,
        household_id: household.id,
        reason,
      },
    }),
  ]);

  return {
    dispute_id: dispute.id,
    transaction_id: transactionId,
    status: 'DISPUTED',
  };
}

/**
 * GET /households/history
 */
async function getHouseholdHistory(userId) {
  const household = await getHouseholdProfileOrThrow(userId);

  const transactions = await prisma.collectionTransaction.findMany({
    where: { household_id: household.id },
    include: { partner: { select: { business_name: true } } },
    orderBy: { logged_at: 'desc' },
  });

  return transactions.map((t) => ({
    transaction_id: t.id,
    partner_name: t.partner.business_name,
    transaction_type: t.transaction_type,
    total_amount: Number(t.total_amount),
    status: t.status,
    logged_at: t.logged_at,
  }));
}

/**
 * GET /partners/history
 */
async function getPartnerHistory(userId) {
  const partner = await getPartnerProfileOrThrow(userId);

  const transactions = await prisma.collectionTransaction.findMany({
    where: { partner_id: partner.id },
    include: { household: { select: { first_name: true, reference_code: true } }, items: true },
    orderBy: { logged_at: 'desc' },
  });

  return transactions.map((t) => ({
    transaction_id: t.id,
    seller_type: t.seller_type,
    reference_code: t.household?.reference_code || null,
    first_name: t.household?.first_name || null,
    transaction_type: t.transaction_type,
    total_amount: Number(t.total_amount),
    status: t.status,
    logged_at: t.logged_at,
    items: t.items.map((i) => ({
      category_id: i.category_id,
      weight_kg: Number(i.weight_kg),
      price_per_kg: Number(i.price_per_kg),
      subtotal: Number(i.subtotal),
    })),
  }));
}

export default {
  lookupHouseholdByReferenceCode,
  logTransactions,
  confirmTransaction,
  disputeTransaction,
  getHouseholdHistory,
  getPartnerHistory,
};