const { z } = require('zod');

// Must match DocType enum in Prisma
const VALID_DOC_TYPES = [
  // Investor
  'PASSPORT', 'CNI_FRONT', 'CNI_BACK', 'PROOF_OF_ADDRESS', 'SELFIE_WITH_ID',
  // Company
  'RCCM_CERT', 'STATUTS', 'NIU_ATTESTATION', 'ATTESTATION_LOCALISATION',
  'PLAN_LOCALISATION', 'PV_ASSEMBLEE', 'REP_ID', 'PATENTE', 'OHADA_DEED'
];

const uploadDocSchema = z.object({
  docType: z.enum(VALID_DOC_TYPES, {
    errorMap: () => ({ message: 'Invalid document type string' })
  }),
});

const reviewDocSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be APPROVED or REJECTED' })
  }),
  reviewNote: z.string().optional(),
});

module.exports = {
  uploadDocSchema,
  reviewDocSchema,
};
