import { z } from 'zod';

const nameField = z.string().trim().max(100);
const phoneField = z.string().trim().max(32);
const notesField = z.string().trim().max(2000);
const emailField = z.union([z.literal(''), z.string().trim().min(1).max(254).email()]);

export const customerSchema = z
  .object({
    firstName: nameField,
    lastName: nameField,
    email: emailField,
    phone: phoneField,
    notes: notesField,
  })
  .strict();

export type CustomerFormValues = z.infer<typeof customerSchema>;
export type CustomerField = keyof CustomerFormValues;
