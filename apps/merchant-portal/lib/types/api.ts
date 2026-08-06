export interface Merchant {
  id: string;
  name: string;
  email: string;
  status: string;
  baseCurrency: string;
  kycStatus: string;
  country?: string;
  businessType?: string;
}

export interface Payment {
  id: string;
  amount: string | number;
  currency: string;
  status: string;
  createdAt: string;
  fraudScore?: number;
  description?: string;
  customer?: { email?: string; name?: string };
}

export interface WalletBalance {
  currency: string;
  balance: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  count: number;
  avgTicket?: number;
}

export interface Payout {
  id: string;
  amount: string | number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  amount: string | number;
  status: string;
  reason?: string;
  payment?: { id: string; amount?: string | number };
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  status: string;
  endpointId?: string;
  createdAt: string;
  endpoint?: { url?: string };
}

export interface ReserveConfig {
  currentReserveBalance: string | number;
  manualHold?: boolean;
  manualHoldAmount?: string | number;
}

export interface DashboardAlert {
  id: string;
  type: "webhook" | "dispute" | "reconciliation" | "payout";
  label: string;
  detail: string;
  severity: "error" | "warning" | "info";
}

export type RevenuePeriod = "daily" | "weekly" | "monthly";

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
}
