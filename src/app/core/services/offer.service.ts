import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResult } from '../models/api-result.model';
import { AdminOffersResponse } from '../models/offer.model';

@Injectable({
  providedIn: 'root'
})
export class OfferService {
  private readonly apiService = inject(ApiService);

  getOffers(
    pageNumber = 1,
    pageSize = 10,
    searchTerm?: string,
    status?: string | null,
    source?: string | null
  ): Observable<ApiResult<AdminOffersResponse>> {
    const params: Record<string, string | number> = {
      pageNumber,
      pageSize
    };
    if (searchTerm && searchTerm.trim()) params['searchTerm'] = searchTerm.trim();
    if (status && status !== 'all') params['status'] = status;
    if (source && source !== 'all') params['source'] = source;

    return this.apiService.get<any>('/admin/offers', params).pipe(
      map((response) => {
        const raw = response?.data ?? response;
        if (raw && (raw.summary || raw.Summary)) {
          const s = raw.summary ?? raw.Summary ?? {};
          const offersRaw = raw.offers ?? raw.Offers ?? [];
          return {
            isSuccess: true,
            data: {
              totalCount: Number(raw.totalCount ?? raw.TotalCount ?? 0),
              summary: {
                totalOffers: Number(s.totalOffers ?? s.TotalOffers ?? 0),
                addedToday: Number(s.addedToday ?? s.AddedToday ?? 0),
                active: Number(s.active ?? s.Active ?? 0),
                hidden: Number(s.hidden ?? s.Hidden ?? 0)
              },
              offers: Array.isArray(offersRaw)
                ? offersRaw.map((o: any) => ({
                    offerId: o.offerId ?? o.OfferId ?? '',
                    shortId: o.shortId ?? o.ShortId ?? '',
                    name: o.name ?? o.Name ?? '',
                    logoUrl: o.logoUrl ?? o.LogoUrl ?? '',
                    source: o.source ?? o.Source ?? '',
                    payout: Number(o.payout ?? o.Payout ?? 0),
                    epc: Number(o.epc ?? o.Epc ?? 0),
                    publishersCount: Number(o.publishersCount ?? o.PublishersCount ?? 0),
                    status: (o.status ?? o.Status ?? 'ACTIVE').toUpperCase()
                  }))
                : []
            }
          };
        }
        return {
          isSuccess: false,
          error: { code: 'NOT_FOUND', description: 'No offers data returned from the server.' }
        };
      }),
      catchError((err) =>
        of({
          isSuccess: false,
          error: {
            code: 'HTTP_ERROR',
            description: err?.error?.detail || err?.message || 'Failed to load offers.'
          }
        })
      )
    );
  }

  toggleOfferStatus(
    offerId: string,
    currentStatus: string
  ): Observable<ApiResult<boolean>> {
    const action = currentStatus.toUpperCase() === 'ACTIVE' ? 'hide' : 'show';
    return this.apiService.post<any>(`/admin/offers/${offerId}/${action}`, {}).pipe(
      map(() => ({ isSuccess: true, data: true })),
      catchError((err) =>
        of({
          isSuccess: false,
          error: {
            code: 'HTTP_ERROR',
            description: err?.error?.detail || err?.message || 'Failed to update offer status.'
          }
        })
      )
    );
  }
}
