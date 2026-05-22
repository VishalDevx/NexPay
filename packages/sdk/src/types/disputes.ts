import { Amount, Currency, PaginationParams } from './common';

export type DisputeStatus = 'pending' | 'under_review' | 'won' | 'lost' | 'closed';

export interface DisputeEvidence {
  description?: string;
  documents?: string[];
}

export interface Dispute {
  id: string;
  amount: Amount;
  currency: Currency;
  status: DisputeStatus;
  chargeId: string;
  reason: string;
  evidence?: DisputeEvidence;
  createdAt: string;
}

export interface DisputeListParams extends PaginationParams {
  status?: DisputeStatus;
}
