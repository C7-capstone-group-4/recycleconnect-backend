import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';
import { sendNotification } from '../../utils/fcmNotifier.js';
import wallet from './wallet.service.js';

const VALID_TRANSACTION_TYPES = ['SCHEDULED_COLLECTION', 'DROP_OFF'];
const VALID_SELLER_TYPES = ['REGISTERED_HOUSEHOLD', 'GENERAL_UNREGISTERED'];
const LOYALTY_POINTS_PER_NAIRA = 100; // +1 point per ₦100

async function getPartnerProfileOrThrow(userId) {
  const partner = await prisma.collectionPartnerProfile.findUnique({ where: { userId } });
  if (!partner) {
    throw new AppError('Collection Partner profile not found for this user.', 404, 'NOT_FOUND');
  }
  return partner;
}

async function getHouseholdProfileOrThrow(userId) {
  const household = await prisma.householdProfile.findUnique({ where: { userId } });
  if (!household) {
    throw new AppError('Household profile not found for this user.', 404, 'NOT_FOUND');
  }
  return household;
}

/**
 * GET /households/lookup/:refCode
 * Partner looks up a household by reference code before logging a collection.
 * Returns first name only — phone number is never exposed here.
 */
async function lookupHouseholdByReferenceCode(refCode) {
  if (!refCode) {
    throw new AppError('Reference code is required.', 400, 'BAD_REQUEST');
  }

  const household = await prisma.householdProfile.findUnique({
    where: { referenceCode: refCode.toUpperCase() },
    select: { id: true, firstName: true, referenceCode: true, serviceZone: true },
  });

  if (!household) {
    throw new AppError('No household found for this reference code.', 404, 'NOT_FOUND');
  }

  return {
    household_id: household.id,
    reference_code: household.referenceCode,
    first_name: household.firstName,
    service_zone: household.serviceZone,
  };
}

function validateTransactionInput(payload) {
  const { seller_type, household_id, unregistered_seller_name, transaction_type, items } = payload;

  const sellerType = seller_type || 'REGISTERED_HOUSEHOLD';
  if (!VALID_SELLER_TYPES.includes(sellerType)) {
    throw new AppError(`seller_type must be one of: ${VALID_SELLER_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
  }
  if (sellerType === 'REGISTERED_HOUSEHOLD' && !household_id) {
    throw new AppError('household_id is required when seller_type is REGISTERED_HOUSEHOLD.', 400, 'BAD_REQUEST');
  }
  if (sellerType === 'GENERAL_UNREGISTERED' && !unregistered_seller_name) {
    throw new AppError(
      'unregistered_seller_name is required when seller_type is GENERAL_UNREGISTERED.',
      400,
      'BAD_REQUEST'
    );
  }
  if (!VALID_TRANSACTION_TYPES.includes(transaction_type)) {
    throw new AppError(
      `transaction_type must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`,
      400,
      'BAD_REQUEST'
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items must be a non-empty array.', 400, 'BAD_REQUEST');
  }
  for (const item of items) {
    if (!item.category_id || item.weight_kg == null || item.price_per_kg == null) {
      throw new AppError('Each item requires category_id, weight_kg, and price_per_kg.', 400, 'BAD_REQUEST');
    }
    if (Number(item.weight_kg) <= 0) {
      throw new AppError('weight_kg must be a positive number.', 400, 'BAD_REQUEST');
    }
    if (Number(item.price_per_kg) <= 0) {
      throw new AppError('price_per_kg must be a positive number.', 400, 'BAD_REQUEST');
    }
  }

  return sellerType;
}

/**
 * Logs a single transaction inside the given Prisma transaction client.
 * - REGISTERED_HOUSEHOLD: validates partner wallet has sufficient funds to
 *   cover the payout (400 INSUFFICIENT_FUNDS if not), starts as
 *   PENDING_CONFIRMATION. No money moves yet — that happens on confirm.
 * - GENERAL_UNREGISTERED: physical cash already changed hands, no confirmation
 *   needed, transaction is created directly as COMPLETED.
 */
async function createSingleTransaction(tx, partnerId, payload) {
  const sellerType = validateTransactionInput(payload);
  const { household_id, unregistered_seller_name, transaction_type, items } = payload;

  let household = null;
  if (sellerType === 'REGISTERED_HOUSEHOLD') {
    household = await tx.householdProfile.findUnique({ where: { id: household_id } });
    if (!household) {
      throw new AppError(`Household ${household_id} not found.`, 404, 'NOT_FOUND');
    }
  }

  const categoryIds = items.map((i) => i.category_id);
  const categories = await tx.materialCategory.findMany({ where: { id: { in: categoryIds } } });
  if (categories.length !== new Set(categoryIds).size) {
    throw new AppError('One or more material categories were not found.', 404, 'NOT_FOUND');
  }

  const itemsWithSubtotals = items.map((item) => ({
    categoryId: item.category_id,
    weightKg: item.weight_kg,
    pricePerKg: item.price_per_kg,
    subtotalCash: Number(item.weight_kg) * Number(item.price_per_kg),
  }));
  const totalCashPaid = itemsWithSubtotals.reduce((sum, i) => sum + i.subtotalCash, 0);

  // Pre-fund validation: only applies to registered households, since that's
  // the flow where digital payout comes from the partner's wallet on confirm.
  if (sellerType === 'REGISTERED_HOUSEHOLD') {
    const partnerWallet = await wallet.getOrCreatePartnerWallet(tx, partnerId);
    if (Number(partnerWallet.balance) < totalCashPaid) {
      throw new AppError(
        `Insufficient wallet funds to cover this payout. Available: ${partnerWallet.balance}, required: ${totalCashPaid}.`,
        400,
        'INSUFFICIENT_FUNDS'
      );
    }
  }

  const transaction = await tx.collectionTransaction.create({
    data: {
      partnerId,
      householdId: sellerType === 'REGISTERED_HOUSEHOLD' ? household_id : null,
      sellerType,
      unregisteredSellerName: sellerType === 'GENERAL_UNREGISTERED' ? unregistered_seller_name : null,
      transactionType: transaction_type,
      totalCashPaid,
      // Unregistered sellers: cash already exchanged physically, no digital
      // confirmation step, so mark COMPLETED immediately.
      status: sellerType === 'GENERAL_UNREGISTERED' ? 'COMPLETED' : 'PENDING_CONFIRMATION',
      items: { create: itemsWithSubtotals },
    },
    include: { items: true, household: { include: { user: true } } },
  });

  // For scheduled collections by registered households, the declaration is
  // completed on CONFIRM (not here at log-time), since the collection isn't
  // considered settled until the household confirms it.
  return transaction;
}

/**
 * POST /partners/transactions
 * Supports both single and batch logging via a `transactions` array.
 */
async function logTransactions(userId, body) {
  const partner = await getPartnerProfileOrThrow(userId);

  const list = Array.isArray(body.transactions) ? body.transactions : [body];
  if (list.length === 0) {
    throw new AppError('At least one transaction is required.', 400, 'BAD_REQUEST');
  }

  const results = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const txPayload of list) {
      const record = await createSingleTransaction(tx, partner.id, txPayload);
      created.push(record);
    }
    return created;
  });

  for (const record of results) {
    if (record.household?.user?.deviceToken) {
      sendNotification(
        record.household.user.deviceToken,
        'Transaction Logged',
        `A cash transaction of ₦${Number(record.totalCashPaid).toFixed(2)} has been recorded. Please confirm.`
      ).catch((err) => console.error('FCM notification failed:', err.message));
    }
  }

  return results.map(formatTransaction);
}

function formatTransaction(t) {
  return {
    transaction_id: t.id,
    household_id: t.householdId,
    seller_type: t.sellerType,
    unregistered_seller_name: t.unregisteredSellerName,
    transaction_type: t.transactionType,
    total_cash_paid: Number(t.totalCashPaid),
    status: t.status,
    logged_at: t.loggedAt,
    items: t.items.map((i) => ({
      category_id: i.categoryId,
      weight_kg: Number(i.weightKg),
      price_per_kg: Number(i.pricePerKg),
      subtotal_cash: Number(i.subtotalCash),
    })),
  };
}

/**
 * PATCH /households/transactions/:id/confirm
 * Household confirms the transaction. Atomically:
 *   1. credits the household wallet
 *   2. debits the partner wallet
 *   3. flips the linked declaration to COMPLETED
 *   4. awards loyalty points (+1 per ₦100)
 *   5. flips the transaction status to COMPLETED
 */
async function confirmTransaction(userId, transactionId) {
  const household = await getHouseholdProfileOrThrow(userId);

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.collectionTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) {
      throw new AppError('Transaction not found.', 404, 'NOT_FOUND');
    }
    if (transaction.householdId !== household.id) {
      throw new AppError('You are not authorized to confirm this transaction.', 403, 'UNAUTHORIZED');
    }
    if (transaction.status === 'COMPLETED') {
      throw new AppError('This transaction has already been confirmed.', 400, 'BAD_REQUEST');
    }
    if (transaction.status === 'DISPUTED') {
      throw new AppError('This transaction is under dispute and cannot be confirmed.', 400, 'BAD_REQUEST');
    }

    const amount = Number(transaction.totalCashPaid);

    // Move money: debit partner, credit household. Partner balance was
    // already validated as sufficient at log-time, but we re-check here
    // since time may have passed and other transactions may have drawn it down.
    const partnerWallet = await wallet.getOrCreatePartnerWallet(tx, transaction.partnerId);
    await wallet.debitWallet(tx, partnerWallet, amount, 'HOUSEHOLD_PAYOUT', transaction.id);

    const householdWallet = await wallet.getOrCreateHouseholdWallet(tx, household.id);
    const updatedHouseholdWallet = await wallet.creditWallet(
      tx,
      householdWallet,
      amount,
      'HOUSEHOLD_PAYOUT',
      transaction.id
    );

    // Award loyalty points: +1 per ₦100
    const pointsAwarded = Math.floor(amount / LOYALTY_POINTS_PER_NAIRA);
    await tx.householdProfile.update({
      where: { id: household.id },
      data: { loyaltyPoints: { increment: pointsAwarded } },
    });

    // Complete the linked declaration, if any
    if (transaction.transactionType === 'SCHEDULED_COLLECTION') {
      const declaration = await tx.scheduledDeclaration.findFirst({
        where: { householdId: household.id, partnerId: transaction.partnerId, status: 'READY' },
        orderBy: { createdAt: 'desc' },
      });
      if (declaration) {
        await tx.scheduledDeclaration.update({ where: { id: declaration.id }, data: { status: 'COMPLETED' } });
      }
    }

    const updatedTransaction = await tx.collectionTransaction.update({
      where: { id: transactionId },
      data: { status: 'COMPLETED' },
    });

    return { updatedTransaction, pointsAwarded, newBalance: updatedHouseholdWallet.balance };
  });

  return {
    transaction_id: result.updatedTransaction.id,
    status: result.updatedTransaction.status,
    total_cash_paid: Number(result.updatedTransaction.totalCashPaid),
    loyalty_points_awarded: result.pointsAwarded,
    household_wallet_balance: Number(result.newBalance),
  };
}

/**
 * POST /households/transactions/:id/dispute
 * Household flags a transaction as incorrect. Pauses payout by setting
 * transaction.status = DISPUTED and creates a Dispute record for Admin review.
 */
async function disputeTransaction(userId, transactionId, { reason }) {
  if (!reason || !reason.trim()) {
    throw new AppError('A reason is required to flag a dispute.', 400, 'BAD_REQUEST');
  }

  const household = await getHouseholdProfileOrThrow(userId);

  const transaction = await prisma.collectionTransaction.findUnique({ where: { id: transactionId } });
  if (!transaction) {
    throw new AppError('Transaction not found.', 404, 'NOT_FOUND');
  }
  if (transaction.householdId !== household.id) {
    throw new AppError('You are not authorized to dispute this transaction.', 403, 'UNAUTHORIZED');
  }
  if (transaction.status === 'COMPLETED') {
    throw new AppError('A confirmed transaction cannot be disputed. Please contact support.', 400, 'BAD_REQUEST');
  }

  const [, dispute] = await prisma.$transaction([
    prisma.collectionTransaction.update({
      where: { id: transactionId },
      data: { status: 'DISPUTED' },
    }),
    prisma.dispute.create({
      data: { transactionId, householdId: household.id, reason },
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
    where: { householdId: household.id },
    include: { partner: { select: { companyName: true } } },
    orderBy: { loggedAt: 'desc' },
  });

  return transactions.map((t) => ({
    transaction_id: t.id,
    partner_name: t.partner.companyName,
    transaction_type: t.transactionType,
    total_cash_paid: Number(t.totalCashPaid),
    status: t.status,
    logged_at: t.loggedAt,
  }));
}

/**
 * GET /partners/history
 */
async function getPartnerHistory(userId) {
  const partner = await getPartnerProfileOrThrow(userId);

  const transactions = await prisma.collectionTransaction.findMany({
    where: { partnerId: partner.id },
    include: { household: { select: { firstName: true, referenceCode: true } }, items: true },
    orderBy: { loggedAt: 'desc' },
  });

  return transactions.map((t) => ({
    transaction_id: t.id,
    seller_type: t.sellerType,
    seller_name: t.sellerType === 'REGISTERED_HOUSEHOLD' ? t.household?.firstName : t.unregisteredSellerName,
    reference_code: t.household?.referenceCode || null,
    transaction_type: t.transactionType,
    total_cash_paid: Number(t.totalCashPaid),
    status: t.status,
    logged_at: t.loggedAt,
    items: t.items.map((i) => ({
      category_id: i.categoryId,
      weight_kg: Number(i.weightKg),
      price_per_kg: Number(i.pricePerKg),
      subtotal_cash: Number(i.subtotalCash),
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
