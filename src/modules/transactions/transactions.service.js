const prisma = require('../../config/db');
const AppError = require('../../utils/AppError');
const { sendNotification } = require('../../utils/fcmNotifier');

const VALID_TRANSACTION_TYPES = ['SCHEDULED_COLLECTION', 'DROP_OFF'];

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

function validateTransactionInput(tx) {
  const { household_id, transaction_type, items } = tx;

  if (!household_id) throw new AppError('household_id is required.', 400, 'BAD_REQUEST');
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
      throw new AppError(
        'Each item requires category_id, weight_kg, and price_per_kg.',
        400,
        'BAD_REQUEST'
      );
    }
    if (Number(item.weight_kg) <= 0) {
      throw new AppError('weight_kg must be a positive number.', 400, 'BAD_REQUEST');
    }
    if (Number(item.price_per_kg) <= 0) {
      throw new AppError('price_per_kg must be a positive number.', 400, 'BAD_REQUEST');
    }
  }
}

/**
 * Logs a single transaction (parent + line items) inside the given Prisma
 * transaction client, auto-calculating subtotals and total, and flipping
 * any matching READY declaration to COMPLETED.
 */
async function createSingleTransaction(tx, partnerId, payload) {
  validateTransactionInput(payload);
  const { household_id, transaction_type, items } = payload;

  // Confirm household exists
  const household = await tx.householdProfile.findUnique({ where: { id: household_id } });
  if (!household) {
    throw new AppError(`Household ${household_id} not found.`, 404, 'NOT_FOUND');
  }

  // Confirm all material categories exist
  const categoryIds = items.map((i) => i.category_id);
  const categories = await tx.materialCategory.findMany({ where: { id: { in: categoryIds } } });
  if (categories.length !== new Set(categoryIds).size) {
    throw new AppError('One or more material categories were not found.', 404, 'NOT_FOUND');
  }

  // Auto-calculate subtotal per line item, then sum for total_cash_paid
  const itemsWithSubtotals = items.map((item) => {
    const subtotal = Number(item.weight_kg) * Number(item.price_per_kg);
    return {
      categoryId: item.category_id,
      weightKg: item.weight_kg,
      pricePerKg: item.price_per_kg,
      subtotalCash: subtotal,
    };
  });
  const totalCashPaid = itemsWithSubtotals.reduce((sum, i) => sum + i.subtotalCash, 0);

  // Create parent + child records together
  const transaction = await tx.collectionTransaction.create({
    data: {
      partnerId,
      householdId: household_id,
      transactionType: transaction_type,
      totalCashPaid,
      items: { create: itemsWithSubtotals },
    },
    include: { items: true, household: { include: { user: true } } },
  });

  // Update linked declaration READY -> COMPLETED (only for scheduled collections,
  // matching the most recent READY declaration for this household+partner)
  if (transaction_type === 'SCHEDULED_COLLECTION') {
    const declaration = await tx.scheduledDeclaration.findFirst({
      where: { householdId: household_id, partnerId, status: 'READY' },
      orderBy: { createdAt: 'desc' },
    });
    if (declaration) {
      await tx.scheduledDeclaration.update({
        where: { id: declaration.id },
        data: { status: 'COMPLETED' },
      });
    }
  }

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

  // Fire-and-forget push notifications after the DB transaction commits
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
    transaction_type: t.transactionType,
    total_cash_paid: Number(t.totalCashPaid),
    is_confirmed_by_home: t.isConfirmedByHome,
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
 */
async function confirmTransaction(userId, transactionId) {
  const household = await getHouseholdProfileOrThrow(userId);

  const transaction = await prisma.collectionTransaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction) {
    throw new AppError('Transaction not found.', 404, 'NOT_FOUND');
  }
  if (transaction.householdId !== household.id) {
    throw new AppError('You are not authorized to confirm this transaction.', 403, 'UNAUTHORIZED');
  }

  const updated = await prisma.collectionTransaction.update({
    where: { id: transactionId },
    data: { isConfirmedByHome: true },
  });

  return {
    transaction_id: updated.id,
    is_confirmed_by_home: updated.isConfirmedByHome,
    total_cash_paid: Number(updated.totalCashPaid),
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
    is_confirmed_by_home: t.isConfirmedByHome,
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
    include: { household: { select: { address: true } }, items: true },
    orderBy: { loggedAt: 'desc' },
  });

  return transactions.map((t) => ({
    transaction_id: t.id,
    household_address: t.household.address,
    transaction_type: t.transactionType,
    total_cash_paid: Number(t.totalCashPaid),
    is_confirmed_by_home: t.isConfirmedByHome,
    logged_at: t.loggedAt,
    items: t.items.map((i) => ({
      category_id: i.categoryId,
      weight_kg: Number(i.weightKg),
      price_per_kg: Number(i.pricePerKg),
      subtotal_cash: Number(i.subtotalCash),
    })),
  }));
}

module.exports = {
  logTransactions,
  confirmTransaction,
  getHouseholdHistory,
  getPartnerHistory,
};
