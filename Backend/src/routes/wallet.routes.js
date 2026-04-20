const express = require('express');
const router = express.Router();

const { getWallet, deposit, withdraw, getTransactions } = require('../controllers/wallet.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { depositSchema, withdrawSchema } = require('../validators/wallet.validators');

router.use(authenticate);

// Get current user's wallet
router.get('/', getWallet);

// Get transaction ledger
router.get('/transactions', getTransactions);

// Mock deposit
router.post('/deposit', validate(depositSchema), deposit);

// Withdraw request
router.post('/withdraw', validate(withdrawSchema), withdraw);

module.exports = router;
