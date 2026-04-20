const prisma = require('../config/db');
const { NotFoundError } = require('../utils/errors');

/**
 * GET /api/admin/dashboard
 * Get high-level platform statistics
 */
async function getDashboardStats(req, res, next) {
  try {
    const totalUsers = await prisma.user.count();
    const totalTrades = await prisma.trade.count();
    
    // Aggregations on Wallet for Total Held Platform-wide
    const wallets = await prisma.wallet.aggregate({
      _sum: { availableBalance: true, escrowBalance: true }
    });

    const pendingKycCount = await prisma.kycDocument.count({
      where: { status: 'PENDING' }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalTrades,
        totalAvailableBalance: wallets._sum.availableBalance || 0,
        totalEscrowBalance: wallets._sum.escrowBalance || 0,
        pendingKycCount
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/users
 * Directory of all users (Investors and Companies)
 */
async function getUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        kycStatus: true,
        isActive: true,
        isSuspended: true,
        createdAt: true,
        investorProfile: { select: { firstName: true, lastName: true, city: true } },
        companyProfile: { select: { companyName: true, sector: true, isVerified: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/users/:id/suspend
 * Suspend or reinstate a user
 */
async function suspendUser(req, res, next) {
  try {
    const { id } = req.params;
    const { isSuspended, reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isSuspended: isSuspended,
        suspendReason: isSuspended ? reason : null
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: isSuspended ? 'SUSPEND_USER' : 'REINSTATE_USER',
        target: user.email,
        details: reason || 'No reason provided'
      }
    });

    res.json({
      success: true,
      message: isSuspended ? 'User suspended successfully' : 'User reinstated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/trades
 * Ledgar of all platform trades
 */
async function getAllTrades(req, res, next) {
  try {
    const trades = await prisma.trade.findMany({
      include: {
        buyer: { select: { email: true } },
        company: { select: { companyName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // Limit to recent 200 for demo
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
 * GET /api/admin/escrow
 * View all active escrow holds
 */
async function getEscrowMonitors(req, res, next) {
  try {
    const holds = await prisma.escrowHold.findMany({
      where: { status: 'LOCKED' },
      include: {
        trade: {
          select: {
            tradeRef: true,
            buyer: { select: { email: true } },
            company: { select: { companyName: true } }
          }
        }
      },
      orderBy: { lockedAt: 'desc' }
    });

    res.json({
      success: true,
      data: { holds }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/audit-logs
 * Security and admin action logs
 */
async function getAuditLogs(req, res, next) {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { actor: { select: { email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardStats,
  getUsers,
  suspendUser,
  getAllTrades,
  getEscrowMonitors,
  getAuditLogs
};
