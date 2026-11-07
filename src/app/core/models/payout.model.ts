export interface PayoutStats {
  totalPendingPayout: number;
  pendingPublishersCount: number;
  totalPaidThisMonth: number;
  monthOverMonthGrowth: number;
  nextPayoutBatch: string;
  awaitingPaymentCount: number;
}

export interface PayoutBreakdown {
  totalRedemptions: number;
  totalPoints: number;
  revenueShare: string;
  totalRevenue: number;
  chargebacks: number;
  netProfit: number;
}

export interface PayoutItem {
  payoutId: string;
  publisherName: string;
  publisherCompany: string;
  period: string;
  amount: number;
  paymentMethod: string;
  scheduledDate: string;
  status: 'SCHEDULED' | 'PAID' | 'FAILED' | string;
  breakdown: PayoutBreakdown;
  isExpanded?: boolean;
}

export interface PagedPayoutsResponse {
  totalCount: number;
  payouts: PayoutItem[];
}
