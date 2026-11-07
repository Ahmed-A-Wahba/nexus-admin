import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResult } from '../models/api-result.model';
import {
  DashboardKpis,
  ChartPoint,
  PublisherStat,
  DashboardEvent
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiService = inject(ApiService);

  getKpis(startDate: string, endDate: string): Observable<ApiResult<DashboardKpis>> {
    const params = new HttpParams()
      .set('StartDate', startDate)
      .set('EndDate', endDate);

    return this.apiService.get<any>('/admin/dashboard/kpis', params).pipe(
      map((res) => this.normalizeResponse<DashboardKpis>(res))
    );
  }

  getChart(startDate: string, endDate: string): Observable<ApiResult<ChartPoint[]>> {
    const params = new HttpParams()
      .set('StartDate', startDate)
      .set('EndDate', endDate);

    return this.apiService.get<any>('/admin/dashboard/chart', params).pipe(
      map((res) => this.normalizeResponse<ChartPoint[]>(res))
    );
  }

  getTopPublishers(startDate: string, endDate: string, limit: number = 4): Observable<ApiResult<PublisherStat[]>> {
    const params = new HttpParams()
      .set('StartDate', startDate)
      .set('EndDate', endDate)
      .set('Limit', limit.toString());

    return this.apiService.get<any>('/admin/dashboard/top-publishers', params).pipe(
      map((res) => this.normalizeResponse<PublisherStat[]>(res))
    );
  }

  getEvents(limit: number = 10): Observable<ApiResult<DashboardEvent[]>> {
    const params = new HttpParams().set('Limit', limit.toString());

    return this.apiService.get<any>('/admin/dashboard/events', params).pipe(
      map((res) => this.normalizeResponse<DashboardEvent[]>(res))
    );
  }

  private normalizeResponse<T>(res: any): ApiResult<T> {
    if (!res) {
      return { isSuccess: true, data: undefined };
    }
    if (res.isSuccess !== undefined) {
      return res as ApiResult<T>;
    }
    return {
      isSuccess: true,
      data: res as T
    };
  }
}
