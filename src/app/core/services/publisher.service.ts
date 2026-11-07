import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResult } from '../models/api-result.model';
import {
  PublisherItem,
  PublisherStatus,
  GetPublishersResponse,
  PublisherDetailsResponse,
  PublisherRevenueStatsResponse,
  OfferPerformanceResponse,
  PaymentDetailsResponse
} from '../models/publisher.model';

const MOCK_PUBLISHERS: PublisherItem[] = [
  {
    publisherId: 'pub_01H1',
    name: 'Alice Johnson',
    companyName: 'Lootably Digital Inc.',
    email: 'contact@lootably.com',
    revenueShareRatio: 0.80,
    totalConversions: 142500,
    totalRevenue: 285000.50,
    completedOffers: 1420,
    status: PublisherStatus.Active,
    registeredAt: '2024-01-15T10:00:00Z'
  },
  {
    publisherId: 'pub_02A9',
    name: 'Bob Chen',
    companyName: 'BitLabs Interactive',
    email: 'partnerships@bitlabs.ai',
    revenueShareRatio: 0.75,
    totalConversions: 98200,
    totalRevenue: 196400.00,
    completedOffers: 982,
    status: PublisherStatus.Active,
    registeredAt: '2024-02-01T14:30:00Z'
  },
  {
    publisherId: 'pub_03C4',
    name: 'Carol White',
    companyName: 'AdGate Media LLC',
    email: 'support@adgatemedia.com',
    revenueShareRatio: 0.85,
    totalConversions: 0,
    totalRevenue: 0.00,
    completedOffers: 0,
    status: PublisherStatus.PendingApproval,
    registeredAt: '2024-02-12T09:15:00Z'
  },
  {
    publisherId: 'pub_04D8',
    name: 'David Kim',
    companyName: 'Torox Offers Network',
    email: 'admin@torox.io',
    revenueShareRatio: 0.70,
    totalConversions: 64100,
    totalRevenue: 128200.25,
    completedOffers: 641,
    status: PublisherStatus.Disabled,
    registeredAt: '2024-03-05T11:45:00Z'
  },
  {
    publisherId: 'pub_05E2',
    name: 'Eve Patel',
    companyName: 'MM Wall Global',
    email: 'ops@mmwall.net',
    revenueShareRatio: 0.80,
    totalConversions: 82400,
    totalRevenue: 164800.00,
    completedOffers: 824,
    status: PublisherStatus.Active,
    registeredAt: '2024-03-20T16:20:00Z'
  },
  {
    publisherId: 'pub_06F7',
    name: 'Frank Torres',
    companyName: 'Offertoro Gaming',
    email: 'contact@offertoro.com',
    revenueShareRatio: 0.78,
    totalConversions: 0,
    totalRevenue: 0.00,
    completedOffers: 0,
    status: PublisherStatus.PendingApproval,
    registeredAt: '2024-04-02T08:10:00Z'
  },
  {
    publisherId: 'pub_07G3',
    name: 'Grace Lee',
    companyName: 'AdGem Network',
    email: 'hello@adgem.com',
    revenueShareRatio: 0.82,
    totalConversions: 175300,
    totalRevenue: 350600.80,
    completedOffers: 1753,
    status: PublisherStatus.Active,
    registeredAt: '2024-04-18T13:00:00Z'
  },
  {
    publisherId: 'pub_08H9',
    name: 'Henry Brown',
    companyName: 'HangMyAds Digital',
    email: 'info@hangmyads.com',
    revenueShareRatio: 0.75,
    totalConversions: 45200,
    totalRevenue: 90400.10,
    completedOffers: 452,
    status: PublisherStatus.Active,
    registeredAt: '2024-05-01T10:00:00Z'
  },
  {
    publisherId: 'pub_09J4',
    name: 'Iris Martin',
    companyName: 'Wannads Media',
    email: 'bizdev@wannads.com',
    revenueShareRatio: 0.80,
    totalConversions: 53100,
    totalRevenue: 106200.50,
    completedOffers: 531,
    status: PublisherStatus.Disabled,
    registeredAt: '2024-05-15T15:40:00Z'
  },
  {
    publisherId: 'pub_10K6',
    name: 'Jack Wilson',
    companyName: 'CPA Grip Global',
    email: 'affiliates@cpagrip.com',
    revenueShareRatio: 0.72,
    totalConversions: 31000,
    totalRevenue: 62000.00,
    completedOffers: 310,
    status: PublisherStatus.Active,
    registeredAt: '2024-06-01T09:00:00Z'
  },
  {
    publisherId: 'pub_11L2',
    name: 'Karen Zhang',
    companyName: 'InBrain Surveys',
    email: 'team@inbrain.ai',
    revenueShareRatio: 0.85,
    totalConversions: 0,
    totalRevenue: 0.00,
    completedOffers: 0,
    status: PublisherStatus.PendingApproval,
    registeredAt: '2024-06-10T11:30:00Z'
  },
  {
    publisherId: 'pub_12M8',
    name: 'Liam Garcia',
    companyName: 'TheoremReach Inc.',
    email: 'contact@theoremreach.com',
    revenueShareRatio: 0.80,
    totalConversions: 134000,
    totalRevenue: 268000.40,
    completedOffers: 1340,
    status: PublisherStatus.Active,
    registeredAt: '2024-06-25T14:15:00Z'
  }
];

@Injectable({
  providedIn: 'root'
})
export class PublisherService {
  private readonly apiService = inject(ApiService);
  private mockPublishers = [...MOCK_PUBLISHERS];

  getPublishers(
    pageNumber: number,
    pageSize: number,
    searchTerm?: string,
    status?: PublisherStatus | null
  ): Observable<ApiResult<GetPublishersResponse>> {
    const params: Record<string, string | number> = {
      PageNumber: pageNumber,
      PageSize: pageSize
    };
    if (searchTerm && searchTerm.trim()) {
      params['SearchTerm'] = searchTerm.trim();
    }
    if (status !== undefined && status !== null) {
      params['Status'] = status;
    }

    return this.apiService.get<any>('/admin/publishers', params).pipe(
      map((response) => {
        const raw = response?.data ?? response;
        if (raw && Array.isArray(raw.items)) {
          return {
            isSuccess: true,
            data: {
              items: raw.items as PublisherItem[],
              totalCount: raw.totalCount ?? raw.items.length,
              pageNumber: raw.pageNumber ?? pageNumber,
              pageSize: raw.pageSize ?? pageSize,
              pendingCount: raw.pendingCount ?? 0
            }
          };
        }
        return this.getMockResult(pageNumber, pageSize, searchTerm, status);
      }),
      catchError(() => of(this.getMockResult(pageNumber, pageSize, searchTerm, status)))
    );
  }

  getPublisherDetails(publisherId: string): Observable<ApiResult<PublisherDetailsResponse>> {
    return this.apiService.get<any>(`/admin/publishers/${publisherId}`).pipe(
      map((response) => {
        const raw = response?.data ?? response;
        if (raw && (raw.publisherId || raw.company)) {
          return {
            isSuccess: true,
            data: {
              publisherId: raw.publisherId ?? publisherId,
              tradingName: raw.tradingName ?? raw.companyName ?? raw.name ?? '',
              legalName: raw.legalName ?? raw.companyName ?? raw.tradingName ?? '',
              logoUrl: raw.logoUrl,
              status: raw.status ?? PublisherStatus.Active,
              company: {
                legalName: raw.company?.legalName ?? raw.legalName ?? raw.companyName ?? '',
                tradingName: raw.company?.tradingName ?? raw.tradingName ?? raw.companyName ?? '',
                registrationNumber: raw.company?.registrationNumber ?? raw.registrationNumber,
                taxId: raw.company?.taxId ?? raw.taxId ?? raw.taxRegistrationNumber,
                country: raw.company?.country ?? raw.countryCode,
                address: raw.company?.address ?? raw.registeredAddress
              },
              contact: {
                name: raw.contact?.name ?? raw.contactName ?? raw.name ?? '',
                email: raw.contact?.email ?? raw.contactEmail ?? raw.email ?? '',
                phone: raw.contact?.phone ?? raw.contactPhone ?? raw.phoneNumber,
                avatarUrl: raw.contact?.avatarUrl
              },
              payment: raw.payment ? {
                type: raw.payment.type ?? '',
                bankName: raw.payment.bankName,
                accountNumberMasked: raw.payment.accountNumberMasked ?? raw.payment.accountNumber,
                accountNumber: raw.payment.accountNumber ?? raw.payment.accountNumberMasked,
                swiftCode: raw.payment.swiftCode
              } : undefined
            }
          };
        }
        return {
          isSuccess: false,
          error: { code: 'NOT_FOUND', description: 'Publisher not found.' }
        };
      }),
      catchError((err) =>
        of({
          isSuccess: false,
          error: {
            code: 'HTTP_ERROR',
            description: err?.error?.detail || err?.message || 'Failed to load publisher details.'
          }
        })
      )
    );
  }

  approvePublisher(publisherId: string): Observable<ApiResult<boolean>> {
    return this.apiService.post<any>(`/admin/publishers/${publisherId}/approve`, {}).pipe(
      map((response) => {
        const item = this.mockPublishers.find((p) => p.publisherId === publisherId);
        if (item) item.status = PublisherStatus.Active;
        return { isSuccess: response?.isSuccess ?? true, data: true };
      }),
      catchError(() => {
        const item = this.mockPublishers.find((p) => p.publisherId === publisherId);
        if (item) item.status = PublisherStatus.Active;
        return of({ isSuccess: true, data: true });
      })
    );
  }

  rejectPublisher(publisherId: string): Observable<ApiResult<boolean>> {
    return this.apiService.post<any>(`/admin/publishers/${publisherId}/reject`, {}).pipe(
      map((response) => {
        const item = this.mockPublishers.find((p) => p.publisherId === publisherId);
        if (item) item.status = PublisherStatus.Disabled;
        return { isSuccess: response?.isSuccess ?? true, data: true };
      }),
      catchError(() => {
        const item = this.mockPublishers.find((p) => p.publisherId === publisherId);
        if (item) item.status = PublisherStatus.Disabled;
        return of({ isSuccess: true, data: true });
      })
    );
  }

  getPublisherRevenueStats(
    publisherId: string,
    fromDate?: string | null,
    toDate?: string | null
  ): Observable<ApiResult<PublisherRevenueStatsResponse>> {
    const params: Record<string, string> = {};
    if (fromDate) params['FromDate'] = fromDate;
    if (toDate) params['ToDate'] = toDate;

    return this.apiService
      .get<any>(`/admin/publishers/${publisherId}/revenue-stats`, params)
      .pipe(
        map((response) => {
          const raw = response?.data ?? response;
          if (raw) {
            const chartData = raw.revenueGrowthChart ?? raw.RevenueGrowthChart ?? [];
            const records = raw.transferRecords ?? raw.TransferRecords ?? [];

            return {
              isSuccess: true,
              data: {
                publisherAbsorbsChargebacks: Boolean(
                  raw.publisherAbsorbsChargebacks ?? raw.PublisherAbsorbsChargebacks ?? false
                ),
                totalRevenue: Number(raw.totalRevenue ?? raw.TotalRevenue ?? 0),
                totalProfit: Number(raw.totalProfit ?? raw.TotalProfit ?? 0),
                pendingRevenue: Number(raw.pendingRevenue ?? raw.PendingRevenue ?? 0),
                nextPayoutInDays: Number(raw.nextPayoutInDays ?? raw.NextPayoutInDays ?? 0),
                totalChargebacks: Number(raw.totalChargebacks ?? raw.TotalChargebacks ?? 0),
                revenueGrowthChart: Array.isArray(chartData)
                  ? chartData.map((pt: any) => ({
                      monthLabel: pt.monthLabel ?? pt.MonthLabel ?? '',
                      value: Number(pt.value ?? pt.Value ?? 0)
                    }))
                  : [],
                transferRecords: Array.isArray(records)
                  ? records.map((t: any) => ({
                      payoutId: t.payoutId ?? t.PayoutId ?? '',
                      transferDate: t.transferDate ?? t.TransferDate ?? '',
                      period: t.period ?? t.Period ?? '',
                      amount: Number(t.amount ?? t.Amount ?? 0),
                      method: t.method ?? t.Method ?? 'Bank Transfer',
                      referenceNumber: t.referenceNumber ?? t.ReferenceNumber ?? '',
                      proofUrl: t.proofUrl ?? t.ProofUrl ?? undefined
                    }))
                  : []
              }
            };
          }
          return {
            isSuccess: false,
            error: {
              code: 'NOT_FOUND',
              description: 'Revenue statistics not available for this publisher.'
            }
          };
        }),
        catchError((err) =>
          of({
            isSuccess: false,
            error: {
              code: 'HTTP_ERROR',
              description:
                err?.error?.detail || err?.message || 'Failed to load revenue statistics.'
            }
          })
        )
      );
  }

  updateChargebackResponsibility(
    publisherId: string,
    hasChargebacks: boolean
  ): Observable<ApiResult<boolean>> {
    return this.apiService
      .put<any>(`/admin/publishers/${publisherId}/chargeback-responsibility`, {
        hasChargebacks
      })
      .pipe(
        map((response) => ({
          isSuccess: response?.isSuccess ?? true,
          data: true
        })),
        catchError((err) =>
          of({
            isSuccess: false,
            error: {
              code: 'HTTP_ERROR',
              description:
                err?.error?.detail ||
                err?.message ||
                'Failed to update chargeback responsibility.'
            }
          })
        )
      );
  }

  getPublisherOfferPerformance(
    publisherId: string,
    searchTerm?: string,
    sortBy?: string,
    fromDate?: string | null,
    toDate?: string | null,
    pageNumber = 1,
    pageSize = 10
  ): Observable<ApiResult<OfferPerformanceResponse>> {
    const params: Record<string, string | number> = {
      pageNumber,
      pageSize
    };
    if (searchTerm && searchTerm.trim()) params['searchTerm'] = searchTerm.trim();
    if (sortBy) params['sortBy'] = sortBy;
    if (fromDate) params['fromDate'] = fromDate;
    if (toDate) params['toDate'] = toDate;

    return this.apiService
      .get<any>(`/admin/publishers/${publisherId}/offer-performance`, params)
      .pipe(
        map((response) => {
          const raw = response?.data ?? response;
          if (raw && (raw.summary || raw.Summary)) {
            const summaryRaw = raw.summary ?? raw.Summary ?? {};
            const offersRaw = raw.offers ?? raw.Offers ?? [];
            return {
              isSuccess: true,
              data: {
                totalOffersCount: Number(raw.totalOffersCount ?? raw.TotalOffersCount ?? 0),
                summary: {
                  offersShown: Number(summaryRaw.offersShown ?? summaryRaw.OffersShown ?? 0),
                  totalCompletions: Number(summaryRaw.totalCompletions ?? summaryRaw.TotalCompletions ?? 0),
                  totalRevenue: Number(summaryRaw.totalRevenue ?? summaryRaw.TotalRevenue ?? 0),
                  averageEpc: Number(summaryRaw.averageEpc ?? summaryRaw.AverageEpc ?? 0)
                },
                offers: Array.isArray(offersRaw)
                  ? offersRaw.map((o: any) => ({
                      rank: Number(o.rank ?? o.Rank ?? 0),
                      offerId: o.offerId ?? o.OfferId ?? '',
                      offerName: o.offerName ?? o.OfferName ?? '',
                      offerShortId: o.offerShortId ?? o.OfferShortId ?? '',
                      provider: o.provider ?? o.Provider ?? 'IN-HOUSE',
                      completions: Number(o.completions ?? o.Completions ?? 0),
                      revenue: Number(o.revenue ?? o.Revenue ?? 0),
                      epc: Number(o.epc ?? o.Epc ?? 0),
                      lastActivity: o.lastActivity ?? o.LastActivity ?? undefined,
                      status: o.status ?? o.Status ?? 'Active'
                    }))
                  : []
              }
            };
          }
          return {
            isSuccess: false,
            error: {
              code: 'NOT_FOUND',
              description: 'Offer performance data not available for this publisher.'
            }
          };
        }),
        catchError((err) =>
          of({
            isSuccess: false,
            error: {
              code: 'HTTP_ERROR',
              description:
                err?.error?.detail || err?.message || 'Failed to load offer performance data.'
            }
          })
        )
      );
  }

  getPaymentDetails(
    publisherId: string
  ): Observable<ApiResult<PaymentDetailsResponse>> {
    return this.apiService
      .get<any>(`/admin/publishers/${publisherId}/payment-details`)
      .pipe(
        map((response) => {
          const raw = response?.data ?? response;
          if (raw && (raw.publisherId || raw.PublisherId)) {
            return {
              isSuccess: true,
              data: {
                publisherId: raw.publisherId ?? raw.PublisherId ?? publisherId,
                displayId: raw.displayId ?? raw.DisplayId ?? '',
                publisherName: raw.publisherName ?? raw.PublisherName ?? undefined,
                accountType: raw.accountType ?? raw.AccountType ?? undefined,
                method: raw.method ?? raw.Method ?? undefined,
                bankName: raw.bankName ?? raw.BankName ?? undefined,
                accountHolder: raw.accountHolder ?? raw.AccountHolder ?? undefined,
                accountNumber: raw.accountNumber ?? raw.AccountNumber ?? undefined,
                swiftCode: raw.swiftCode ?? raw.SwiftCode ?? undefined,
                routingNumber: raw.routingNumber ?? raw.RoutingNumber ?? undefined,
                currency: raw.currency ?? raw.Currency ?? undefined,
                bankAddress: raw.bankAddress ?? raw.BankAddress ?? undefined
              }
            };
          }
          return {
            isSuccess: false,
            error: {
              code: 'NOT_FOUND',
              description: 'Payment details not found for this publisher.'
            }
          };
        }),
        catchError((err) =>
          of({
            isSuccess: false,
            error: {
              code: 'HTTP_ERROR',
              description:
                err?.error?.detail || err?.message || 'Failed to load payment details.'
            }
          })
        )
      );
  }

  private getMockResult(
    pageNumber: number,
    pageSize: number,
    searchTerm?: string,
    status?: PublisherStatus | null
  ): ApiResult<GetPublishersResponse> {
    let filtered = [...this.mockPublishers];

    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.companyName.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.publisherId.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      );
    }

    if (status !== undefined && status !== null) {
      filtered = filtered.filter((p) => p.status === status);
    }

    const pendingCount = this.mockPublishers.filter(
      (p) => p.status === PublisherStatus.PendingApproval
    ).length;

    const totalCount = filtered.length;
    const startIndex = (pageNumber - 1) * pageSize;
    const items = filtered.slice(startIndex, startIndex + pageSize);

    return {
      isSuccess: true,
      data: { items, totalCount, pageNumber, pageSize, pendingCount }
    };
  }
}
