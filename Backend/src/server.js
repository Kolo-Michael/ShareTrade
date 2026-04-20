const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');

const app = express();

// ═══════════════════════════════════════════════
//  GLOBAL MIDDLEWARE
// ═══════════════════════════════════════════════

// Security headers
app.use(helmet());

// CORS — allow the frontend to call the API
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (100 requests per 15 min per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// ═══════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ShareTrade API is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Auth routes
app.use('/api/auth', require('./routes/auth.routes'));

// KYC routes
app.use('/api/kyc', require('./routes/kyc.routes'));

// Static uploads folder (for serving images locally before Cloudinary integration)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Trade routes
app.use('/api/trades', require('./routes/trade.routes'));

// Wallet routes
app.use('/api/wallet', require('./routes/wallet.routes'));

// Company routes
app.use('/api/companies', require('./routes/company.routes'));

// Admin routes
app.use('/api/admin', require('./routes/admin.routes'));

// TODO: Phase 2+ routes
// app.use('/api/investor', require('./routes/investor.routes'));

// ═══════════════════════════════════════════════
//  ERROR HANDLING
// ═══════════════════════════════════════════════

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (env.NODE_ENV === 'development') {
    console.error('❌ Error:', err.message);
    if (!err.isOperational) console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === 'development' && !err.isOperational && { stack: err.stack }),
  });
});

// ═══════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════

app.listen(env.PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   ShareTrade P2P API                     ║
  ║   Running on http://localhost:${env.PORT}      ║
  ║   Environment: ${env.NODE_ENV.padEnd(23)}║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
