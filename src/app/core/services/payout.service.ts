import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResult } from '../models/api-result.model';
import {
  PayoutStats,
  PayoutItem,
  PayoutBreakdown,
  PagedPayoutsResponse
} from '../models/payout.model';

@Injectable({ providedIn: 'root' })
export class PayoutService {
  private readonly api = inject(ApiService);

  // ── GET /admin/payouts/stats ─────────────────────────────────
  getPayoutStats(): Observable<ApiResult<PayoutStats>> {
    return this.api.get<any>('/admin/payouts/stats').pipe(
      map((response) => {
        const r = response?.data ?? response?.value ?? response;
        if (r) {
          return {
            isSuccess: true,
            data: {
              totalPendingPayout: Number(r.totalPendingPayout ?? r.TotalPendingPayout ?? 0),
              pendingPublishersCount: Number(r.pendingPublishersCount ?? r.PendingPublishersCount ?? 0),
              totalPaidThisMonth: Number(r.totalPaidThisMonth ?? r.TotalPaidThisMonth ?? 0),
              monthOverMonthGrowth: Number(r.monthOverMonthGrowth ?? r.MonthOverMonthGrowth ?? 0),
              nextPayoutBatch: r.nextPayoutBatch ?? r.NextPayoutBatch ?? '',
              awaitingPaymentCount: Number(r.awaitingPaymentCount ?? r.AwaitingPaymentCount ?? 0)
            }
          };
        }
        return { isSuccess: false, error: { code: 'NO_DATA', description: 'No stats returned.' } };
      }),
      catchError((err) => of({
        isSuccess: false,
        error: { code: 'HTTP_ERROR', description: err?.error?.detail || err?.message || 'Failed to load payout stats.' }
      }))
    );
  }

  // ── GET /admin/payouts ───────────────────────────────────────
  getPayouts(
    partnerId?: string,
    status?: string | null,
    startDate?: string,
    endDate?: string,
    pageNumber = 1,
    pageSize = 10
  ): Observable<ApiResult<PagedPayoutsResponse>> {
    const params: Record<string, string | number> = { pageNumber, pageSize };
    if (partnerId) params['partnerId'] = partnerId;
    if (status && status !== 'all') params['status'] = status;
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;

    return this.api.get<any>('/admin/payouts', params).pipe(
      map((response) => {
        const raw = response?.data ?? response?.value ?? response;
        const payouts = raw?.payouts ?? raw?.Payouts ?? [];
        return {
          isSuccess: true,
          data: {
            totalCount: Number(raw?.totalCount ?? raw?.TotalCount ?? 0),
            payouts: Array.isArray(payouts) ? payouts.map((p: any): PayoutItem => {
              const b = p.breakdown ?? p.Breakdown ?? {};
              return {
                payoutId: p.payoutId ?? p.PayoutId ?? '',
                publisherName: p.publisherName ?? p.PublisherName ?? '',
                publisherCompany: p.publisherCompany ?? p.PublisherCompany ?? '',
                period: p.period ?? p.Period ?? '',
                amount: Number(p.amount ?? p.Amount ?? 0),
                paymentMethod: p.paymentMethod ?? p.PaymentMethod ?? '',
                scheduledDate: p.scheduledDate ?? p.ScheduledDate ?? '',
                status: (p.status ?? p.Status ?? 'SCHEDULED').toUpperCase(),
                breakdown: {
                  totalRedemptions: Number(b.totalRedemptions ?? b.TotalRedemptions ?? 0),
                  totalPoints: Number(b.totalPoints ?? b.TotalPoints ?? 0),
                  revenueShare: b.revenueShare ?? b.RevenueShare ?? '0%',
                  totalRevenue: Number(b.totalRevenue ?? b.TotalRevenue ?? 0),
                  chargebacks: Number(b.chargebacks ?? b.Chargebacks ?? 0),
                  netProfit: Number(b.netProfit ?? b.NetProfit ?? 0)
                },
                isExpanded: false
              };
            }) : []
          }
        };
      }),
      catchError((err) => of({
        isSuccess: false,
        error: { code: 'HTTP_ERROR', description: err?.error?.detail || err?.message || 'Failed to load payouts.' }
      }))
    );
  }
}
