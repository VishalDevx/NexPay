import { Amount, Currency } from './common';

export interface SubMerchant {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
}

export interface SubMerchantCreateParams {
  name: string;
  email: string;
  accountDetails?: Record<string, string>;
}

export interface SplitParams {
  merchantId: string;
  amount: Amount;
  currency: Currency;
  splits: SplitEntry[];
}

export interface SplitEntry {
  subMerchantId: string;
  amount: Amount;
  percentage?: number;
}

export interface SplitTransaction {
  id: string;
  merchantId: string;
  amount: Amount;
  currency: Currency;
  splits: SplitEntry[];
  createdAt: string;
}
