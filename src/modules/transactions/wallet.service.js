const AppError = require('../../utils/AppError');

/**
 * Minimal internal wallet ledger, scoped to what Package 3's confirm-and-settle
 * flow needs (credit/debit + balance check). Paystack topup, withdrawal, and
 * bank-linking belong to Package 4 and are NOT implemented here.
 */

/**
 * Fetch (or lazily create) a household's wallet within a Prisma transaction client.
 */
async function getOrCreateHouseholdWallet(tx, householdId) {
  let wallet = await tx.wallet.findUnique({ where: { householdId } });
  if (!wallet) {
    wallet = await tx.wallet.create({
      data: { ownerType: 'HOUSEHOLD', householdId, balance: 0 },
    });
  }
  return wallet;
}

/**
 * Fetch (or lazily create) a partner's wallet within a Prisma transaction client.
 */
async function getOrCreatePartnerWallet(tx, partnerId) {
  let wallet = await tx.wallet.findUnique({ where: { partnerId } });
  if (!wallet) {
    wallet = await tx.wallet.create({
      data: { ownerType: 'COLLECTION_PARTNER', partnerId, balance: 0 },
    });
  }
  return wallet;
}

/**
 * Debit a wallet, throwing AppError(400, INSUFFICIENT_FUNDS) if balance is too low.
 * Must be called within a Prisma $transaction for atomicity.
 */
async function debitWallet(tx, wallet, amount, referenceType, referenceId) {
  const numericAmount = Number(amount);
  if (Number(wallet.balance) < numericAmount) {
    throw new AppError(
      `Insufficient wallet funds. Available: ${wallet.balance}, required: ${numericAmount}.`,
      400,
      'INSUFFICIENT_FUNDS'
    );
  }

  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: { decrement: numericAmount } },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amount: numericAmount,
      type: 'DEBIT',
      referenceType,
      referenceId,
    },
  });

  return updated;
}

/**
 * Credit a wallet. Must be called within a Prisma $transaction for atomicity.
 */
async function creditWallet(tx, wallet, amount, referenceType, referenceId) {
  const numericAmount = Number(amount);

  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: numericAmount } },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amount: numericAmount,
      type: 'CREDIT',
      referenceType,
      referenceId,
    },
  });

  return updated;
}

module.exports = {
  getOrCreateHouseholdWallet,
  getOrCreatePartnerWallet,
  debitWallet,
  creditWallet,
};
