export type CustomerStatus = 'ACTIVE' | 'ARCHIVED';

export interface Customer {
  code: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}
