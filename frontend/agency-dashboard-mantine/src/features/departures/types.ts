export type DepartureStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

/** One scheduled run of a tour. Codes are `DEP-…`; the row always stays readable. */
export interface Departure {
  code: string;
  status: DepartureStatus;
  startAt: string;
  endAt: string;
  capacity: number;
  bookingDeadline: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
