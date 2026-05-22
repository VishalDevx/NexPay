import { Amount, Currency, PaginationParams } from './common';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Payout {
  id: string;
  amount: Amount;
  currency: Currency;
  status: PayoutStatus;
  destination: string;
  description?: string;
  createdAt: string;
}

export interface PayoutCreateParams {
  amount: Amount;
  currency: Currency;
  destination: string;
  description?: string;
}

export interface PayoutListParams extends PaginationParams {
  status?: PayoutStatus;
}
