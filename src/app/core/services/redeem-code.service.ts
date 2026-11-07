import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResult } from '../models/api-result.model';
import { RedeemCodesResponse, RedeemCodeItemDto } from '../models/redeem-code.model';

@Injectable({
  providedIn: 'root'
})
export class RedeemCodeService {
  private readonly apiService = inject(ApiService);

  getCodes(
    pageNumber = 1,
    pageSize = 10,
    searchTerm?: string,
    status?: string | null
  ): Observable<ApiResult<RedeemCodesResponse>> {
    const params: Record<string, string | number> = { pageNumber, pageSize };
    if (searchTerm && searchTerm.trim()) params['searchTerm'] = searchTerm.trim();
    if (status && status.toLowerCase() !== 'all') params['status'] = status;

    return this.apiService.get<any>('/admin/redeem-codes', params).pipe(
      map((response) => {
        // Support both wrapped { value: ... } and direct response
        const raw = response?.value ?? response?.data ?? response;
        if (raw && (raw.codes !== undefined || raw.Codes !== undefined)) {
          const codesRaw = raw.codes ?? raw.Codes ?? [];
          return {
            isSuccess: true,
            data: {
              totalCount: Number(raw.totalCount ?? raw.TotalCount ?? 0),
              codes: Array.isArray(codesRaw)
                ? codesRaw.map((c: any) => ({
                    id: c.id ?? c.Id ?? '',
                    code: c.code ?? c.Code ?? '',
                    points: Number(c.points ?? c.Points ?? 0),
                    value: Number(c.value ?? c.Value ?? 0),
                    userId: c.userId ?? c.UserId ?? '',
                    status: (c.status ?? c.Status ?? 'ACTIVE').toUpperCase(),
                    createdAt: c.createdAt ?? c.CreatedAt ?? '',
                    expiresAt: c.expiresAt ?? c.ExpiresAt ?? undefined
                  }))
                : []
            }
          };
        }
        return {
          isSuccess: false,
          error: { code: 'NOT_FOUND', description: 'No redeem codes data returned.' }
        };
      }),
      catchError((err) =>
        of({
          isSuccess: false,
          error: {
            code: 'HTTP_ERROR',
            description: err?.error?.detail || err?.message || 'Failed to load redeem codes.'
          }
        })
      )
    );
  }

  recallCode(id: string): Observable<ApiResult<boolean>> {
    return this.apiService.post<any>(`/admin/redeem-codes/${id}/recall`, {}).pipe(
      map(() => ({ isSuccess: true, data: true })),
      catchError((err) =>
        of({
          isSuccess: false,
          error: {
            code: 'HTTP_ERROR',
            description: err?.error?.detail || err?.message || 'Failed to recall code.'
          }
        })
      )
    );
  }
}
