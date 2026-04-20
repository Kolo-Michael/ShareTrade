const express = require('express');
const router = express.Router();

const { createListing, getMyListings, getCapTable } = require('../controllers/company.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// All company routes are protected and require COMPANY role
router.use(authenticate);
router.use(requireRole('COMPANY'));

router.post('/listings', createListing);
router.get('/listings', getMyListings);
router.get('/captable', getCapTable);

module.exports = router;
