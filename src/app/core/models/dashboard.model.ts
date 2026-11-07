export interface KpiMetric {
  value: number;
  percentageChange: number;
}

export interface DashboardKpis {
  revenueToday: KpiMetric;
  revenueTotal: KpiMetric;
  profit: KpiMetric;
  clicks: KpiMetric;
  completedOffers: KpiMetric;
  epc: KpiMetric;
  activeOffers: number;
  approvedRevenue: number;
  rejectedRevenue: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface PublisherStat {
  name: string;
  conversionsCount: number;
  totalRevenue: number;
}

export interface DashboardEvent {
  time: string;
  eventType: string;
  offer: string;
  publisher: string;
  payout: number;
  status: string;
}
