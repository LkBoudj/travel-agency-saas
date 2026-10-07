import type { RecordPaymentFormValues } from '../schemas/payment.schema.ts';
import type { RecordPaymentPayload } from '../types.ts';

export function buildRecordPaymentPayload(values: RecordPaymentFormValues): RecordPaymentPayload {
  const amount =
    typeof values.amount === 'number' ? values.amount : Number.parseFloat(values.amount);
  let paidAtIso: string | undefined = undefined;
  if (values.paidAt) {
    const d = values.paidAt instanceof Date ? values.paidAt : new Date(values.paidAt);
    if (!Number.isNaN(d.getTime())) {
      paidAtIso = d.toISOString();
    }
  }
  return {
    amount: Math.round(amount * 100) / 100,
    method: values.method || null,
    reference: values.reference?.trim() || null,
    paidAt: paidAtIso,
    note: values.note?.trim() || null,
  };
}

export function formatPaymentAmount(
  value: number | null | undefined,
  currency: string,
  locale?: string
): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return new Intl.NumberFormat(locale ?? 'en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPaymentDate(iso: string, locale?: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return new Intl.DateTimeFormat(locale ?? 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return iso;
  }
}
