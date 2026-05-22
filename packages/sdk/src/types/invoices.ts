import { Amount, Currency, Metadata, PaginationParams } from './common';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void' | 'cancelled';

export interface LineItem {
  description: string;
  amount: Amount;
  quantity: number;
}

export interface InvoiceCreateParams {
  customerId: string;
  lineItems: LineItem[];
  dueDate?: string;
  description?: string;
  metadata?: Metadata;
  currency?: Currency;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  lineItems: LineItem[];
  total: Amount;
  currency: Currency;
  status: InvoiceStatus;
  dueDate?: string;
  description?: string;
  metadata?: Metadata;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListParams extends PaginationParams {
  status?: InvoiceStatus;
  customerId?: string;
}
