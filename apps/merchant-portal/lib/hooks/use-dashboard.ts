import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import api from "@/lib/api";
import type {
  PaginatedResponse,
  Payment,
  RevenuePeriod,
  RevenuePoint,
  WalletBalance,
  Payout,
  Dispute,
  WebhookDelivery,
  ReserveConfig,
  DashboardAlert,
} from "@/lib/types/api";

export function useRevenue(period: RevenuePeriod) {
  return useQuery({
    queryKey: ["analytics", "revenue", period],
    queryFn: () =>
      api.get<PaginatedResponse<RevenuePoint>>(`/analytics/revenue?period=${period}`),
  });
}

export function useRecentPayments(limit = 6) {
  return useQuery({
    queryKey: ["payments", "recent", limit],
    queryFn: () =>
      api.get<PaginatedResponse<Payment>>(`/payments/charges?limit=${limit}`),
  });
}

export function useWalletBalances() {
  return useQuery({
    queryKey: ["wallets", "balance"],
    queryFn: () => api.get<PaginatedResponse<WalletBalance>>("/wallets/balance"),
  });
}

export function usePayouts() {
  return useQuery({
    queryKey: ["payouts"],
    queryFn: () => api.get<PaginatedResponse<Payout>>("/payouts/payouts"),
  });
}

export function useDisputes() {
  return useQuery({
    queryKey: ["disputes"],
    queryFn: () => api.get<PaginatedResponse<Dispute>>("/disputes"),
  });
}

export function useWebhookDeliveries() {
  return useQuery({
    queryKey: ["webhooks", "deliveries"],
    queryFn: () =>
      api.get<PaginatedResponse<WebhookDelivery>>("/merchants/webhooks/deliveries"),
  });
}

export function useReserveConfig() {
  return useQuery({
    queryKey: ["reserve", "config"],
    queryFn: () => api.get<ReserveConfig>("/reserve/config"),
  });
}

export function useReconciliationSummary() {
  return useQuery({
    queryKey: ["reconciliation", "summary"],
    queryFn: () =>
      api.get<{ openMatches: number; unmatchedBatches: number }>("/reconciliation/summary"),
  });
}

export function useDashboardAlerts() {
  const { data: deliveriesData, isLoading: deliveriesLoading } = useWebhookDeliveries();
  const { data: disputesData, isLoading: disputesLoading } = useDisputes();
  const { data: reconciliationData, isLoading: reconciliationLoading } =
    useReconciliationSummary();

  const alerts = useMemo((): DashboardAlert[] => {
    const items: DashboardAlert[] = [];

    const failedDeliveries = (deliveriesData?.data ?? []).filter(
      (d) => d.status === "FAILED" || d.status === "DLQ"
    );
    for (const d of failedDeliveries.slice(0, 2)) {
      items.push({
        id: `webhook-${d.id}`,
        type: "webhook",
        label: "Webhook delivery failed",
        detail: d.endpoint?.url || `Delivery ${d.id.slice(0, 8)}`,
        severity: "error",
      });
    }

    const openDisputes = (disputesData?.data ?? []).filter(
      (d) =>
        d.status === "RAISED" ||
        d.status === "UNDER_REVIEW" ||
        d.status === "OPEN"
    );
    for (const d of openDisputes.slice(0, 2)) {
      items.push({
        id: `dispute-${d.id}`,
        type: "dispute",
        label: "Pending dispute",
        detail: `${d.payment?.id?.slice(0, 12) ?? d.id.slice(0, 12)} — ${d.reason?.replace(/_/g, " ") ?? "Review required"}`,
        severity: "warning",
      });
    }

    const openMatches = reconciliationData?.openMatches ?? 0;
    if (openMatches > 0) {
      items.push({
        id: "reconciliation",
        type: "reconciliation",
        label: "Reconciliation items open",
        detail: `${openMatches} open match${openMatches === 1 ? "" : "es"} need review`,
        severity: "info",
      });
    }

    return items;
  }, [deliveriesData, disputesData, reconciliationData]);

  return {
    alerts,
    isLoading: deliveriesLoading || disputesLoading || reconciliationLoading,
  };
}

export function useDashboardMetrics(revenueData: RevenuePoint[] | undefined, payments: Payment[] | undefined) {
  const revData = revenueData ?? [];
  const allPayments = payments ?? [];

  const totalRevenue = revData.reduce((s, r) => s + Number(r.revenue), 0);
  const successCount = revData.reduce((s, r) => s + Number(r.count), 0);

  const totalPayments = allPayments.length;
  const failed = allPayments.filter((p) => p.status === "FAILED").length;
  const failureRate = totalPayments > 0 ? (failed / totalPayments) * 100 : 0;

  return {
    revenue: totalRevenue,
    successCount,
    failureRate: `${failureRate.toFixed(1)}%`,
    avgTicket: successCount > 0 ? totalRevenue / successCount : 0,
  };
}
