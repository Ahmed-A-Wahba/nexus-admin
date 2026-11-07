export enum PublisherStatus {
  PendingApproval = 0,
  Active = 1,
  Disabled = 2
}

export interface PublisherItem {
  publisherId: string;
  name: string;
  companyName: string;
  email: string;
  revenueShareRatio: number;
  totalConversions: number;
  totalRevenue: number;
  completedOffers: number;
  status: PublisherStatus | 'PendingApproval' | 'Active' | 'Disabled' | string;
  registeredAt: string;
  /** @deprecated use registeredAt */
  createdAt?: string;
}

export interface PublisherDetailsResponse {
  publisherId: string;
  tradingName: string;
  legalName: string;
  logoUrl?: string;
  status: PublisherStatus | number | string; // 0 = PendingApproval, 1 = Active, 2 = Disabled
  company: CompanyDetails;
  contact: ContactPerson;
  payment?: PaymentMethod;
}

export interface CompanyDetails {
  legalName: string;
  tradingName: string;
  registrationNumber?: string;
  taxId?: string;
  country?: string;
  address?: string;
}

export interface ContactPerson {
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface PaymentMethod {
  type: string;
  bankName?: string;
  accountNumberMasked?: string;
  accountNumber?: string;
  swiftCode?: string;
}

export interface GetPublishersResponse {
  items: PublisherItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  pendingCount: number;
}

// Keep legacy alias for backward compatibility if needed elsewhere
export type Publisher = PublisherItem;
export type PublisherListResponse = GetPublishersResponse;

export interface PublisherRevenueStatsResponse {
  publisherAbsorbsChargebacks: boolean;
  totalRevenue: number;
  totalProfit: number;
  pendingRevenue: number;
  nextPayoutInDays: number;
  totalChargebacks: number;
  revenueGrowthChart: RevenueChartDataPoint[];
  transferRecords: TransferRecordDto[];
}

export interface RevenueChartDataPoint {
  monthLabel: string;
  value: number;
}

export interface TransferRecordDto {
  payoutId: string;
  transferDate: string;
  period: string;
  amount: number;
  method: string;
  referenceNumber: string;
  proofUrl?: string;
}

export interface OfferPerformanceResponse {
  summary: PerformanceSummary;
  totalOffersCount: number;
  offers: OfferPerformanceItemDto[];
}

export interface PerformanceSummary {
  offersShown: number;
  totalCompletions: number;
  totalRevenue: number;
  averageEpc: number;
}

export interface OfferPerformanceItemDto {
  rank: number;
  offerId: string;
  offerName: string;
  offerShortId: string;
  provider: string;
  completions: number;
  revenue: number;
  epc: number;
  lastActivity?: string;
  status: string;
}

export interface OfferPerformanceQuery {
  searchTerm?: string;
  sortBy?: string;
  fromDate?: string | null;
  toDate?: string | null;
  pageNumber: number;
  pageSize: number;
}

export interface PaymentDetailsResponse {
  publisherId: string;
  displayId: string;
  publisherName?: string;
  accountType?: string;
  method?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  swiftCode?: string;
  routingNumber?: string;
  currency?: string;
  bankAddress?: string;
}
