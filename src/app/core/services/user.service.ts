import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResult } from '../models/api-result.model';
import {
  UserProfileResponse,
  ActivityLogResponse,
  SupportTicketsResponse,
  ActivityItemDto,
  SupportTicketItemDto
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  // ── GET /admin/users/profile?searchTerm=... ──────────────────
  getUserProfile(searchTerm: string): Observable<ApiResult<UserProfileResponse>> {
    return this.api.get<any>('/admin/users/profile', { searchTerm }).pipe(
      map((response) => {
        const raw = response?.data ?? response?.value ?? response;
        const u = raw?.user ?? raw?.User ?? raw;
        const s = raw?.stats ?? raw?.Stats ?? {};
        if (u && (u.id || u.Id)) {
          return {
            isSuccess: true,
            data: {
              user: {
                id: u.id ?? u.Id ?? '',
                displayId: u.displayId ?? u.DisplayId ?? '',
                partnerName: u.partnerName ?? u.PartnerName ?? '',
                status: u.status ?? u.Status ?? '',
                currentBalance: Number(u.currentBalance ?? u.CurrentBalance ?? 0),
                publisherUserId: u.publisherUserId ?? u.PublisherUserId ?? ''
              },
              stats: {
                totalOffersCompleted: Number(s.totalOffersCompleted ?? s.TotalOffersCompleted ?? 0),
                totalPointsEarned: Number(s.totalPointsEarned ?? s.TotalPointsEarned ?? 0),
                totalRedemptions: Number(s.totalRedemptions ?? s.TotalRedemptions ?? 0)
              }
            }
          };
        }
        return {
          isSuccess: false,
          error: { code: 'NOT_FOUND', description: 'User not found. Please check the ID and try again.' }
        };
      }),
      catchError((err) => of({
        isSuccess: false,
        error: { code: 'HTTP_ERROR', description: err?.error?.detail || err?.message || 'Failed to load user profile.' }
      }))
    );
  }

  // ── GET /admin/users/{userId}/activity ────────────────────────
  getActivityLog(
    userId: string,
    eventType?: string | null,
    startDate?: string,
    endDate?: string,
    pageNumber = 1,
    pageSize = 10
  ): Observable<ApiResult<ActivityLogResponse>> {
    const params: Record<string, string | number> = { pageNumber, pageSize };
    if (eventType && eventType !== 'all') params['eventType'] = eventType;
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;

    return this.api.get<any>(`/admin/users/${userId}/activity`, params).pipe(
      map((response) => {
        const raw = response?.data ?? response?.value ?? response;
        const activities = raw?.activities ?? raw?.Activities ?? [];
        return {
          isSuccess: true,
          data: {
            totalCount: Number(raw?.totalCount ?? raw?.TotalCount ?? 0),
            activities: Array.isArray(activities) ? activities.map((a: any): ActivityItemDto => ({
              timestamp: a.timestamp ?? a.Timestamp ?? '',
              eventType: a.eventType ?? a.EventType ?? '',
              details: a.details ?? a.Details ?? '',
              pointsChange: Number(a.pointsChange ?? a.PointsChange ?? 0),
              status: a.status ?? a.Status ?? ''
            })) : []
          }
        };
      }),
      catchError((err) => of({
        isSuccess: false,
        error: { code: 'HTTP_ERROR', description: err?.error?.detail || err?.message || 'Failed to load activity log.' }
      }))
    );
  }

  // ── GET /admin/support-tickets/open ─────────────────────────
  getOpenSupportTickets(
    pageNumber = 1,
    pageSize = 10
  ): Observable<ApiResult<SupportTicketsResponse>> {
    return this.api.get<any>('/admin/support-tickets/open', { pageNumber, pageSize }).pipe(
      map((response) => {
        const raw = response?.data ?? response?.value ?? response;
        const tickets = raw?.tickets ?? raw?.Tickets ?? [];
        return {
          isSuccess: true,
          data: {
            totalCount: Number(raw?.totalCount ?? raw?.TotalCount ?? 0),
            tickets: Array.isArray(tickets) ? tickets.map((t: any): SupportTicketItemDto => ({
              ticketId: t.ticketId ?? t.TicketId ?? '',
              displayTicketId: t.displayTicketId ?? t.DisplayTicketId ?? '',
              userId: t.userId ?? t.UserId ?? '',
              displayUserId: t.displayUserId ?? t.DisplayUserId ?? '',
              subject: t.subject ?? t.Subject ?? '',
              category: t.category ?? t.Category ?? '',
              submittedDate: t.submittedDate ?? t.SubmittedDate ?? '',
              status: t.status ?? t.Status ?? ''
            })) : []
          }
        };
      }),
      catchError((err) => of({
        isSuccess: false,
        error: { code: 'HTTP_ERROR', description: err?.error?.detail || err?.message || 'Failed to load support tickets.' }
      }))
    );
  }
}
