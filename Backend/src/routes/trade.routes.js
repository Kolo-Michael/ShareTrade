const express = require('express');
const router = express.Router();

const { initiateTrade, getMyTrades, approveTrade, rejectTrade } = require('../controllers/trade.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { initiateTradeSchema, approveTradeSchema } = require('../validators/trade.validators');

router.use(authenticate);

// ── Shared Endpoints ────────────────────────────────
router.get('/', getMyTrades);

// ── Investor Endpoints ──────────────────────────────
router.post('/', requireRole('INVESTOR'), validate(initiateTradeSchema), initiateTrade);

// ── Company Endpoints ───────────────────────────────
router.put('/:id/approve', requireRole('COMPANY'), validate(approveTradeSchema), approveTrade);
router.put('/:id/reject', requireRole('COMPANY'), rejectTrade);

module.exports = router;
