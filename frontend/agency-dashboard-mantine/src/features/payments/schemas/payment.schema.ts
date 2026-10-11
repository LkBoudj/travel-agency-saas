import { z } from 'zod';
import { PAYMENT_METHODS } from '../types.ts';

const MAX_AMOUNT = 9_999_999_999.99;

export const recordPaymentFormSchema = z
  .object({
    amount: z
      .union([z.number(), z.string()])
      .refine((val) => {
        const num = typeof val === 'number' ? val : Number.parseFloat(val);
        return Number.isFinite(num) && num >= 0.01 && num <= MAX_AMOUNT;
      }, 'validation.amountInvalid')
      .refine((val) => {
        const num = typeof val === 'number' ? val : Number.parseFloat(val);
        return Math.abs(num * 100 - Math.round(num * 100)) < 1e-9;
      }, 'validation.amountDecimals'),
    method: z.enum(PAYMENT_METHODS).nullable().optional(),
    reference: z.string().trim().max(120, 'validation.referenceMax').optional(),
    paidAt: z.union([z.date(), z.string()]).nullable().optional(),
    note: z.string().trim().max(2000, 'validation.noteMax').optional(),
  })
  .strict();

export type RecordPaymentFormValues = z.infer<typeof recordPaymentFormSchema>;
