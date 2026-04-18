const { z } = require('zod');

// ── Register: Investor ────────────────────────────
const registerInvestorSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.literal('INVESTOR'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
});

// ── Register: Company ─────────────────────────────
const registerCompanySchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.literal('COMPANY'),
  companyName: z.string().min(1, 'Company name is required'),
  legalForm: z.enum(['SA', 'SARL', 'SAS', 'SNC', 'GIE', 'SE', 'ETS']),
  rccmNumber: z.string().optional(),
  niuNumber: z.string().optional(),
  shareCapital: z.number().positive().optional(),
  incorporationDate: z.string().optional(),
  sector: z.enum([
    'AGRICULTURE', 'BANKING', 'CONSTRUCTION', 'ENERGY', 'HEALTH',
    'ICT', 'INSURANCE', 'MANUFACTURING', 'RETAIL', 'SERVICES',
    'TRANSPORT', 'OTHER'
  ]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  poBox: z.string().optional(),
  companyEmail: z.string().email().optional(),
  companyPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  repName: z.string().optional(),
  repTitle: z.string().optional(),
  repEmail: z.string().email().optional().or(z.literal('')),
  repPhone: z.string().optional(),
});

// ── Combined register schema (discriminated union) ─
const registerSchema = z.discriminatedUnion('role', [
  registerInvestorSchema,
  registerCompanySchema,
]);

// ── Login ─────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

// ── Change password ───────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
};
