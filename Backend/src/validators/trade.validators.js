const { z } = require('zod');

const initiateTradeSchema = z.object({
  listingId: z.string().cuid('Valid listing ID required'),
  shares: z.number().int().positive('Shares must be a positive integer'),
});

const approveTradeSchema = z.object({
  // No strict body required, just the ID in params, but we could add notes
  note: z.string().optional(),
});

module.exports = {
  initiateTradeSchema,
  approveTradeSchema
};
