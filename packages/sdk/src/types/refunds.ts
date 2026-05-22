import { Amount, Currency } from './common';
import { PaginationParams } from './common';

export interface Refund {
  id: string;
  amount: Amount;
  currency: Currency;
  status: string;
  reason?: string;
  chargeId: string;
  createdAt: string;
}

export interface RefundListParams extends PaginationParams {
  chargeId?: string;
}
