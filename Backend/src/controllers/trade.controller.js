const prisma = require('../config/db');
const escrowService = require('../services/escrow.service');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/errors');
const { Prisma } = require('@prisma/client');

/**
 * POST /api/trades
 * Investor initiates a buy order for a listing.
 */
async function initiateTrade(req, res, next) {
  try {
    const { listingId, shares } = req.validatedBody;
    const buyerId = req.user.id;

    // We must use a database transaction to prevent race conditions on listing available shares & wallet balances
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get Listing + Company
      const listing = await tx.shareListing.findUnique({
        where: { id: listingId },
        include: { company: { select: { userId: true } } }
      });

      if (!listing) throw new NotFoundError('Listing not found');
      if (listing.status !== 'ACTIVE') throw new BadRequestError('Listing is not active');
      if (listing.availableShares < shares) throw new ConflictError('Not enough shares available in this listing');
      if (shares < listing.minPurchase) throw new BadRequestError(`Minimum purchase is ${listing.minPurchase} shares`);
      if (listing.maxPurchase && shares > listing.maxPurchase) throw new BadRequestError(`Maximum purchase is ${listing.maxPurchase} shares`);

      const totalAmount = new Prisma.Decimal(shares).times(listing.pricePerShare);

      // 2. Lock Funds in Escrow via EscrowService
      // Wait, EscrowService might not accept `tx` correctly if we aren't careful, but we designed it to accept it.
      // Wait, we need to create the trade FIRST so we have a tradeId for the escrow.
      
      const trade = await tx.trade.create({
        data: {
          type: 'BUY',
          buyerId,
          sellerId: listing.company.userId, // for primary market the seller is the company itself
          companyId: listing.companyId,
          listingId: listing.id,
          shares,
          pricePerShare: listing.pricePerShare,
          totalAmount: totalAmount,
          status: 'ESCROW_LOCKED'
        }
      });

      // 3. Escrow lock
      await escrowService.lockFunds(trade.id, buyerId, totalAmount, tx);

      // 4. Reserve shares in the listing
      await tx.shareListing.update({
        where: { id: listing.id },
        data: { availableShares: { decrement: shares } }
      });

      // 5. Create Notification for the Company
      await tx.notification.create({
        data: {
          userId: listing.company.userId,
          title: 'New Trade Request',
          message: `An investor has requested to buy ${shares} shares. Escrow funds are locked and pending your approval.`,
          type: 'TRADE'
        }
      });

      return trade;
    });

    res.status(201).json({
      success: true,
      message: 'Trade initiated successfully and funds locked in escrow',
      data: { trade: result }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/trades
 * Get current user's trades (as buyer, seller, or company)
 */
async function getMyTrades(req, res, next) {
  try {
    const userId = req.user.id;
    
    // If COMPANY, fetch trades where company user is seller or the target company
    // If INVESTOR, fetch where buyer is user
    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
          { company: { userId: userId } }
        ]
      },
      include: {
        company: { select: { companyName: true } },
        listing: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { trades }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/trades/:id/approve
 * (Company ONLY) Approves a pending trade. Releases escrow & generates certificate.
 */
async function approveTrade(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch trade
      const trade = await tx.trade.findUnique({
        where: { id },
        include: { company: true }
      });

      if (!trade) throw new NotFoundError('Trade not found');
      if (trade.company.userId !== userId) throw new BadRequestError('You are not authorized to approve this trade');
      if (trade.status !== 'ESCROW_LOCKED') throw new BadRequestError('Trade is not in ESCROW_LOCKED status');

      // 2. Release Funds to Seller
      await escrowService.releaseFunds(trade.id, trade.sellerId, tx);

      // 3. Mark Trade Completed
      const completedTrade = await tx.trade.update({
        where: { id: trade.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });

      // 4. Update or Create ShareHolding for Investor
      const buyerProfile = await tx.investorProfile.findUnique({ where: { userId: trade.buyerId } });
      
      const holding = await tx.shareHolding.findUnique({
        where: { investorId_companyId: { investorId: buyerProfile.id, companyId: trade.companyId } }
      });

      if (holding) {
        // Calculate new average cost basis
        const oldTotalValue = holding.sharesOwned * parseFloat(holding.averageCostBasis);
        const newTotalValue = oldTotalValue + parseFloat(trade.totalAmount);
        const newTotalShares = holding.sharesOwned + trade.shares;
        const newAvg = newTotalValue / newTotalShares;

        await tx.shareHolding.update({
          where: { id: holding.id },
          data: {
            sharesOwned: newTotalShares,
            averageCostBasis: newAvg
          }
        });
      } else {
        await tx.shareHolding.create({
          data: {
            investorId: buyerProfile.id,
            companyId: trade.companyId,
            sharesOwned: trade.shares,
            averageCostBasis: trade.pricePerShare
          }
        });
      }

      // Note: Certificate Generation would happen here, but we will defer pdf generation for now.
      
      // 5. Notify Investor
      await tx.notification.create({
        data: {
          userId: trade.buyerId,
          title: 'Trade Approved',
          message: `Your purchase of ${trade.shares} shares in ${trade.company.companyName} has been approved and completed.`,
          type: 'TRADE'
        }
      });

      return completedTrade;
    });

    res.json({
      success: true,
      message: 'Trade approved and completed successfully',
      data: { trade: result }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/trades/:id/reject
 * (Company ONLY) Rejects a trade and refunds buyer.
 */
async function rejectTrade(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const trade = await tx.trade.findUnique({ where: { id }, include: { company: true } });

      if (!trade) throw new NotFoundError('Trade not found');
      if (trade.company.userId !== userId) throw new BadRequestError('Unauthorized');
      if (trade.status !== 'ESCROW_LOCKED') throw new BadRequestError('Invalid trade status');

      // 1. Refund Escrow
      await escrowService.refundFunds(trade.id, tx);

      // 2. Mark Trade Cancelled
      const cancelledTrade = await tx.trade.update({
        where: { id: trade.id },
        data: { status: 'COMPANY_REJECTED', cancelledAt: new Date(), cancelReason: 'Company rejected the transaction' }
      });

      // 3. Return shares to listing pool if applicable
      if (trade.listingId) {
        await tx.shareListing.update({
          where: { id: trade.listingId },
          data: { availableShares: { increment: trade.shares } }
        });
      }

      // 4. Notify Investor
      await tx.notification.create({
        data: {
          userId: trade.buyerId,
          title: 'Trade Rejected',
          message: `Your purchase of ${trade.shares} shares in ${trade.company.companyName} was rejected. Funds refunded to balance.`,
          type: 'TRADE'
        }
      });

      return cancelledTrade;
    });

    res.json({
      success: true,
      message: 'Trade rejected and funds refunded',
      data: { trade: result }
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  initiateTrade,
  getMyTrades,
  approveTrade,
  rejectTrade
};
