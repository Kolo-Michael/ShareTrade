const { z } = require('zod');

// Must match PaymentMethod enum in Prisma
const VALID_PAYMENT_METHODS = [
  'MTN_MOMO', 'ORANGE_MONEY', 'EXPRESS_UNION',
  'BANK_BICEC', 'BANK_AFRILAND', 'WESTERN_UNION'
];

const depositSchema = z.object({
  amount: z.number().positive('Deposit amount must be a positive number'),
  paymentMethod: z.enum(VALID_PAYMENT_METHODS, {
    errorMap: () => ({ message: 'Invalid payment method' })
  }),
  reference: z.string().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().positive('Withdrawal amount must be a positive number'),
  paymentMethod: z.enum(VALID_PAYMENT_METHODS, {
    errorMap: () => ({ message: 'Invalid payment method' })
  }),
  destinationDetails: z.string().min(1, 'Destination details (like phone number or IBAN) are required'),
});

module.exports = {
  depositSchema,
  withdrawSchema
};
