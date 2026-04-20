const prisma = require('../config/db');
const { BadRequestError } = require('../utils/errors');
const { Prisma } = require('@prisma/client');

/**
 * GET /api/wallet
 * Get full wallet details and summary for the authenticated user
 */
async function getWallet(req, res, next) {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!wallet) throw new BadRequestError('Wallet not found');

    res.json({
      success: true,
      data: { wallet }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/wallet/deposit
 * Initiate a deposit (mocked for now)
 */
async function deposit(req, res, next) {
  try {
    const { amount, paymentMethod, reference } = req.validatedBody;

    // Use transaction to ensure safe balance update and ledger entry
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch wallet
      const wallet = await tx.wallet.findUnique({ where: { userId: req.user.id } });
      if (!wallet) throw new BadRequestError('Wallet not found');

      // 2. Add to available balance & total deposited
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { increment: amount },
          totalDeposited: { increment: amount }
        }
      });

      // 3. Log transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: amount,
          balanceAfter: updatedWallet.availableBalance,
          paymentMethod,
          reference,
          description: `Deposit via ${paymentMethod}`,
          status: 'COMPLETED' // We skip the PENDING state since this is a mock implementation
        }
      });

      // 4. Create a notification
      await tx.notification.create({
        data: {
          userId: req.user.id,
          title: 'Deposit Successful',
          message: `Your deposit of XAF ${amount} via ${paymentMethod} has been credited to your wallet.`,
          type: 'WALLET'
        }
      });

      return { wallet: updatedWallet, transaction };
    });

    res.status(201).json({
      success: true,
      message: 'Deposit successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/wallet/withdraw
 * Request a withdrawal out of the wallet
 */
async function withdraw(req, res, next) {
  try {
    const { amount, paymentMethod, destinationDetails } = req.validatedBody;

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: req.user.id } });
      
      if (!wallet) throw new BadRequestError('Wallet not found');
      if (wallet.availableBalance.lt(amount)) throw new BadRequestError('Insufficient balance for this withdrawal');

      // Check KYC status - perhaps they can't withdraw unless APPROVED
      // In a real system, you might enforce:
      /*
      if (req.user.kycStatus !== 'APPROVED') {
        throw new BadRequestError('You must complete KYC before withdrawing funds');
      }
      */

      // Proceed with withdrawal deduction
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: amount },
          totalWithdrawn: { increment: amount }
        }
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount: -amount, // stored as negative
          balanceAfter: updatedWallet.availableBalance,
          paymentMethod,
          reference: destinationDetails,
          description: `Withdrawal request to ${paymentMethod} (${destinationDetails})`,
          status: 'PENDING' // Withdrawals are often manually processed or async
        }
      });

      await tx.notification.create({
        data: {
          userId: req.user.id,
          title: 'Withdrawal Requested',
          message: `Your withdrawal request for XAF ${amount} is being processed.`,
          type: 'WALLET'
        }
      });

      return { wallet: updatedWallet, transaction };
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/wallet/transactions
 * Get transaction ledger for the wallet
 */
async function getTransactions(req, res, next) {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.json({ success: true, data: { transactions: [] } });

    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { transactions }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getWallet,
  deposit,
  withdraw,
  getTransactions
};
