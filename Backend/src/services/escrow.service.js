const prisma = require('../config/db');
const { AppError, BadRequestError } = require('../utils/errors');

/**
 * Escrow Service
 * Handles locking, releasing, and refunding XAF balances securely
 * always using Prisma transactions for ACID guarantees.
 */

class EscrowService {
  /**
   * Locks funds from a buyer's wallet into escrow for a specific trade.
   */
  async lockFunds(tradeId, buyerId, amount, tx = prisma) {
    // 1. Fetch wallet
    const wallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
    if (!wallet) throw new BadRequestError('Wallet not found');

    // 2. Check balance
    if (wallet.availableBalance.lt(amount)) {
      throw new BadRequestError('Insufficient funds to complete this trade');
    }

    // 3. Move balance from available to escrow
    const updatedWallet = await tx.wallet.update({
      where: { userId: buyerId },
      data: {
        availableBalance: { decrement: amount },
        escrowBalance: { increment: amount },
      },
    });

    // 4. Create EscrowHold record
    const escrowHold = await tx.escrowHold.create({
      data: {
        tradeId,
        amount,
        status: 'LOCKED',
      },
    });

    // 5. Create WalletTransaction ledger entry
    await tx.walletTransaction.create({
      data: {
        walletId: updatedWallet.id,
        type: 'ESCROW_LOCK',
        amount: -amount,
        balanceAfter: updatedWallet.availableBalance, // represents remaining spendable
        reference: `ESCROW_LOCK_${tradeId}`,
        description: `Funds locked in escrow for trade ${tradeId}`,
        status: 'COMPLETED'
      }
    });

    return escrowHold;
  }

  /**
   * Releases funds from escrow to the seller's wallet upon completion.
   */
  async releaseFunds(tradeId, sellerId, tx = prisma) {
    const hold = await tx.escrowHold.findUnique({ where: { tradeId } });
    if (!hold || hold.status !== 'LOCKED') {
      throw new BadRequestError('Valid locked funds not found for this trade');
    }

    // Process using nested transactions to ensure atomicity
    await tx.$transaction(async (txClient) => {
      // Find the trade to get the buyer ID (who holds the escrow)
      const trade = await txClient.trade.findUnique({ where: { id: tradeId } });

      // 1. Deduct from buyer's escrow
      await txClient.wallet.update({
        where: { userId: trade.buyerId },
        data: { escrowBalance: { decrement: hold.amount } }
      });

      // 2. Add to seller's available balance
      const sellerWallet = await txClient.wallet.update({
        where: { userId: sellerId },
        data: { availableBalance: { increment: hold.amount } }
      });

      // 3. Mark escrow as released
      await txClient.escrowHold.update({
        where: { id: hold.id },
        data: { status: 'RELEASED', releasedAt: new Date() }
      });

      // 4. Create Ledger entries
      // Seller credit
      await txClient.walletTransaction.create({
        data: {
          walletId: sellerWallet.id,
          type: 'TRADE_CREDIT',
          amount: hold.amount,
          balanceAfter: sellerWallet.availableBalance,
          reference: `TRADE_${tradeId}`,
          description: `Credit from completed trade ${tradeId}`,
          status: 'COMPLETED'
        }
      });
      
      // We don't necessarily log a debit for the buyer here because the debit 
      // happened conceptually at ESCROW_LOCK. The money is now just gone from escrow.
      // E.g., we could log ESCROW_RELEASE if strictly needed for double-entry.
    });

    return true;
  }

  /**
   * Refunds funds from escrow back to the buyer's available balance
   * (e.g. if trade is cancelled or rejected).
   */
  async refundFunds(tradeId, tx = prisma) {
    const hold = await tx.escrowHold.findUnique({ where: { tradeId }, include: { trade: true } });
    if (!hold || hold.status !== 'LOCKED') {
      return false; // Or throw depending on strictness
    }

    await tx.$transaction(async (txClient) => {
      // 1. Move back from escrow to available
      const buyerWallet = await txClient.wallet.update({
        where: { userId: hold.trade.buyerId },
        data: { 
          escrowBalance: { decrement: hold.amount },
          availableBalance: { increment: hold.amount }
        }
      });

      // 2. Mark escrow as refunded
      await txClient.escrowHold.update({
        where: { id: hold.id },
        data: { status: 'REFUNDED', releasedAt: new Date() }
      });

      // 3. Ledger entry
      await txClient.walletTransaction.create({
        data: {
          walletId: buyerWallet.id,
          type: 'ESCROW_REFUND',
          amount: hold.amount,
          balanceAfter: buyerWallet.availableBalance,
          reference: `REFUND_${tradeId}`,
          description: `Escrow refund for cancelled trade ${tradeId}`,
          status: 'COMPLETED'
        }
      });
    });

    return true;
  }
}

module.exports = new EscrowService();
