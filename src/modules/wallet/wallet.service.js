import prisma from '../../config/db.js';


/**
 * Fetch or create a user's wallet linked via user_id
 */
async function getOrCreateWallet(tx, userId) {
  const prismaClient = tx || prisma;
  let wallet = await prismaClient.wallet.findUnique({
    where: { user_id: userId },
  });

  if (!wallet) {
    wallet = await prismaClient.wallet.create({
      data: { user_id: userId, balance: 0.0 },
    });
  }
  return wallet;
}

/**
 * Debit a wallet inside a Prisma transaction
 */
async function debitWallet(tx, walletId, amount, referenceType, paystackRef = null) {
  const numericAmount = Number(amount);
  const currentWallet = await tx.wallet.findUnique({ where: { id: walletId } });

  if (!currentWallet || Number(currentWallet.balance) < numericAmount) {
    const err = new Error(`Insufficient wallet funds. Available: ₦${currentWallet?.balance || 0}, Required: ₦${numericAmount}`);
    err.statusCode = 400;
    err.errorType = 'INSUFFICIENT_FUNDS';
    throw err;
  }

  const updatedWallet = await tx.wallet.update({
    where: { id: walletId },
    data: { balance: { decrement: numericAmount } },
  });

  await tx.walletTransaction.create({
    data: {
      wallet_id: walletId,
      amount: numericAmount,
      type: 'DEBIT',
      reference_type: referenceType,
      paystack_ref: paystackRef,
    },
  });

  return updatedWallet;
}

/**
 * Credit a wallet inside a Prisma transaction
 */
async function creditWallet(tx, walletId, amount, referenceType, paystackRef = null) {
  const numericAmount = Number(amount);

  const updatedWallet = await tx.wallet.update({
    where: { id: walletId },
    data: { balance: { increment: numericAmount } },
  });

  await tx.walletTransaction.create({
    data: {
      wallet_id: walletId,
      amount: numericAmount,
      type: 'CREDIT',
      reference_type: referenceType,
      paystack_ref: paystackRef,
    },
  });

  return updatedWallet;
}

export default {
  getOrCreateWallet,
  debitWallet,
  creditWallet,
};
