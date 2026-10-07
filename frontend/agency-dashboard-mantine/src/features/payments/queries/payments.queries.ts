/**
 * Query keys for agency payment data.
 *
 * Scoped to the agency code. Ledger is keyed by booking code.
 */
export const paymentsQueryKeys = {
  all: (agencyCode: string) => ['agency', agencyCode, 'payments'] as const,
  ledger: (agencyCode: string, bookingCode: string) =>
    ['agency', agencyCode, 'payments', 'ledger', bookingCode] as const,
};
