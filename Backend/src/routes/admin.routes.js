const express = require('express');
const router = express.Router();

const { 
  getDashboardStats, 
  getUsers, 
  suspendUser, 
  getAllTrades, 
  getEscrowMonitors, 
  getAuditLogs 
} = require('../controllers/admin.controller');

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// All admin routes are protected and require the ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/suspend', suspendUser);
router.get('/trades', getAllTrades);
router.get('/escrow', getEscrowMonitors);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
