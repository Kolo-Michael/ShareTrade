const prisma = require('../config/db');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const env = require('../config/env');

/**
 * POST /api/kyc/upload
 * Upload a document and create a KycDocument record
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      throw new BadRequestError('No file provided');
    }

    const { docType } = req.body; // already validated by zod middleware
    if (!docType) {
      throw new BadRequestError('docType is required');
    }
    
    // For local upload, we generate a URL that maps to the static folder.
    // In production, this would be a Cloudinary URL.
    const fileUrl = `${env.FRONTEND_URL.replace('5500', env.PORT)}/uploads/${req.file.filename}`;

    // Upsert the document (if user already uploaded this type, replace the record)
    // Wait, the schema doesn't enforce unique constraints on userId + docType, 
    // so we'll just check if it exists, and either update or create.
    const existing = await prisma.kycDocument.findFirst({
      where: { userId: req.user.id, docType: docType }
    });

    let doc;
    if (existing) {
      doc = await prisma.kycDocument.update({
        where: { id: existing.id },
        data: {
          fileName: req.file.originalname,
          fileUrl: fileUrl,
          fileSize: req.file.size,
          status: 'PENDING',
          reviewedBy: null,
          reviewNote: null,
          reviewedAt: null,
          uploadedAt: new Date()
        }
      });
    } else {
      doc = await prisma.kycDocument.create({
        data: {
          userId: req.user.id,
          docType: docType,
          fileName: req.file.originalname,
          fileUrl: fileUrl,
          fileSize: req.file.size,
          status: 'PENDING'
        }
      });
    }

    // Move user's kycStatus to PENDING if NOT_SUBMITTED
    if (req.user.kycStatus === 'NOT_SUBMITTED') {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { kycStatus: 'PENDING' }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document: doc }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/kyc/status
 * Get the current user's document statuses
 */
async function getStatus(req, res, next) {
  try {
    const documents = await prisma.kycDocument.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        docType: true,
        status: true,
        reviewNote: true,
        uploadedAt: true,
        fileUrl: true, // Only if you want users to see their own uploaded files
      }
    });

    res.json({
      success: true,
      data: {
        kycStatus: req.user.kycStatus,
        documents
      }
    });
  } catch (error) {
    next(error);
  }
}

// ── Admin Endpoints ─────────────────────────────────

/**
 * GET /api/kyc/queue
 * (Admin) Get all pending KYC documents grouped by user
 */
async function getPendingQueue(req, res, next) {
  try {
    const pendingDocs = await prisma.kycDocument.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            investorProfile: { select: { firstName: true, lastName: true } },
            companyProfile: { select: { companyName: true } }
          }
        }
      },
      orderBy: { uploadedAt: 'asc' }
    });

    res.json({
      success: true,
      data: { pendingDocs }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/kyc/:docId/review
 * (Admin) Approve or Reject a specific document
 */
async function reviewDocument(req, res, next) {
  try {
    const { docId } = req.params;
    const { status, reviewNote } = req.validatedBody;

    const doc = await prisma.kycDocument.findUnique({ where: { id: docId } });
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    const updated = await prisma.kycDocument.update({
      where: { id: docId },
      data: {
        status,
        reviewNote,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      }
    });

    // Optionally check if ALL required docs for user are APPROVED
    // If so, update user.kycStatus = 'APPROVED'
    // That involves finding user role, checking which docs are needed, etc.
    // For now, we leave that up to a manual admin action, or just keep it simple.

    res.json({
      success: true,
      message: `Document ${status.toLowerCase()}`,
      data: { document: updated }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadDocument,
  getStatus,
  getPendingQueue,
  reviewDocument
};
