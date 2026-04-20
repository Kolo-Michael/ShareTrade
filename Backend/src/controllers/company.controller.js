const prisma = require('../config/db');
const { BadRequestError, NotFoundError } = require('../utils/errors');

/**
 * POST /api/companies/listings
 */
async function createListing(req, res, next) {
  try {
    const { totalShares, pricePerShare, minPurchase, maxPurchase, title, description } = req.body;
    
    // Ensure company is verified before listing
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user.id } });
    if (!company) throw new NotFoundError('Company profile not found');
    
    // In strict mode you might check: 
    // if (!company.isVerified) throw new BadRequestError('Company must be verified to list shares');

    const listing = await prisma.shareListing.create({
      data: {
        companyId: company.id,
        title,
        description,
        totalShares,
        availableShares: totalShares,
        pricePerShare,
        minPurchase: minPurchase || 1,
        maxPurchase: maxPurchase || null,
        status: 'ACTIVE'
      }
    });

    res.status(201).json({ success: true, data: { listing } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/companies/listings
 */
async function getMyListings(req, res, next) {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user.id } });
    if (!company) return res.json({ success: true, data: { listings: [] } });

    const listings = await prisma.shareListing.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: { listings } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/companies/captable
 */
async function getCapTable(req, res, next) {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user.id } });
    if (!company) throw new NotFoundError('Company not found');

    const holdings = await prisma.shareHolding.findMany({
      where: { companyId: company.id, sharesOwned: { gt: 0 } },
      include: {
        investor: {
          select: { firstName: true, lastName: true, city: true, user: { select: { email: true } } }
        }
      },
      orderBy: { sharesOwned: 'desc' }
    });

    res.json({ success: true, data: { captable: holdings } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createListing,
  getMyListings,
  getCapTable
};
