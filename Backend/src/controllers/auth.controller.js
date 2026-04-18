const prisma = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } = require('../utils/errors');

/**
 * POST /api/auth/register
 * Register a new investor or company account
 */
async function register(req, res, next) {
  try {
    const data = req.validatedBody;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(data.password);

    // Use a transaction to create User + Profile + Wallet atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create the base user
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: data.role,
        },
      });

      // Create role-specific profile
      if (data.role === 'INVESTOR') {
        await tx.investorProfile.create({
          data: {
            userId: user.id,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            city: data.city || null,
            region: data.region || null,
          },
        });
      } else if (data.role === 'COMPANY') {
        await tx.companyProfile.create({
          data: {
            userId: user.id,
            companyName: data.companyName,
            legalForm: data.legalForm,
            rccmNumber: data.rccmNumber || null,
            niuNumber: data.niuNumber || null,
            shareCapital: data.shareCapital || null,
            incorporationDate: data.incorporationDate ? new Date(data.incorporationDate) : null,
            sector: data.sector || null,
            address: data.address || null,
            city: data.city || null,
            region: data.region || null,
            poBox: data.poBox || null,
            companyEmail: data.companyEmail || null,
            companyPhone: data.companyPhone || null,
            website: data.website || null,
            repName: data.repName || null,
            repTitle: data.repTitle || null,
            repEmail: data.repEmail || null,
            repPhone: data.repPhone || null,
          },
        });
      }

      // Create wallet for the user
      await tx.wallet.create({
        data: { userId: user.id },
      });

      return user;
    });

    // Generate JWT
    const token = generateToken({ id: result.id, email: result.email, role: result.role });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: result.id,
          email: result.email,
          role: result.role,
          kycStatus: result.kycStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticate with email and password
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.validatedBody;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        investorProfile: { select: { firstName: true, lastName: true } },
        companyProfile: { select: { companyName: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive || user.isSuspended) {
      throw new UnauthorizedError('Account is suspended. Contact support.');
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    // Build display name
    let displayName = user.email;
    if (user.investorProfile) {
      displayName = `${user.investorProfile.firstName} ${user.investorProfile.lastName}`;
    } else if (user.companyProfile) {
      displayName = user.companyProfile.companyName;
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          kycStatus: user.kycStatus,
          displayName,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user's full profile
 */
async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        kycStatus: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        investorProfile: true,
        companyProfile: true,
        wallet: {
          select: {
            availableBalance: true,
            escrowBalance: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/auth/change-password
 * Change the current user's password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.validatedBody;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash },
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, getMe, changePassword };
