const express = require('express');
const router = express.Router();

const { uploadDocument, getStatus, getPendingQueue, reviewDocument } = require('../controllers/kyc.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const upload = require('../middleware/upload');
const { reviewDocSchema, uploadDocSchema } = require('../validators/kyc.validators');

// All KYC routes require authentication
router.use(authenticate);

// ── User Endpoints ───────────────────────────────────

// Get user's own KYC status
router.get('/status', getStatus);

// Upload a document (multipart/form-data)
// Note: We validate docType in the controller manually or via middleware on req.body
// but because it's multipart, Zod validation middleware needs to run AFTER multer parsing.
const multerUpload = upload.single('document');
const validateUploadData = (req, res, next) => {
  // Only valid after multer attaches req.body
  const result = uploadDocSchema.safeParse(req.body);
  if (!result.success) {
    const errorMsg = result.error.issues.map(i => i.message).join('; ');
    return res.status(400).json({ success: false, message: errorMsg });
  }
  next();
};

router.post('/upload', multerUpload, validateUploadData, uploadDocument);


// ── Admin Endpoints ──────────────────────────────────
router.use('/admin', requireRole('ADMIN'));
router.get('/admin/queue', getPendingQueue);
router.put('/admin/review/:docId', validate(reviewDocSchema), reviewDocument);

module.exports = router;
