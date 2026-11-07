import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
  inject
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import ApexCharts from 'apexcharts';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  DashboardKpis,
  ChartPoint,
  PublisherStat,
  DashboardEvent
} from '../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);

  @ViewChild('revenueChart', { static: false }) chartRef!: ElementRef;

  private chart: ApexCharts | null = null;

  // Initial date calculation (YYYY-MM-DD local format)
  private getInitialDates(): { start: string; end: string } {
    const endObj = new Date();
    const startObj = new Date();
    startObj.setDate(startObj.getDate() - 30);
    return {
      start: this.formatDate(startObj),
      end: this.formatDate(endObj)
    };
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Date Signals
  readonly startDate = signal<string>(this.getInitialDates().start);
  readonly endDate = signal<string>(this.getInitialDates().end);

  // Angular Signals for reactive state
  readonly kpis = signal<DashboardKpis | null>(null);
  readonly chartData = signal<ChartPoint[]>([]);
  readonly topPublishers = signal<PublisherStat[]>([]);
  readonly events = signal<DashboardEvent[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedTimeframe = signal<'day' | 'week' | 'month'>('week');

  readonly timeframes: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Chart will be initialized after data arrives
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const startDate = this.startDate();
    const endDate = this.endDate();

    forkJoin({
      kpisRes: this.dashboardService.getKpis(startDate, endDate),
      chartRes: this.dashboardService.getChart(startDate, endDate),
      publishersRes: this.dashboardService.getTopPublishers(startDate, endDate, 4),
      eventsRes: this.dashboardService.getEvents(10)
    }).subscribe({
      next: ({ kpisRes, chartRes, publishersRes, eventsRes }) => {
        this.kpis.set(kpisRes?.data ?? null);
        this.chartData.set(chartRes?.data ?? []);
        this.topPublishers.set(publishersRes?.data ?? []);
        this.events.set(eventsRes?.data ?? []);
        this.isLoading.set(false);

        // Initialize or update chart after data is ready and view is rendered
        setTimeout(() => this.initChart(), 50);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to load dashboard data. Please try refreshing.');
        setTimeout(() => this.initChart(), 50);
      }
    });
  }

  onDateRangeChange(start: string, end: string): void {
    if (start && end) {
      this.startDate.set(start);
      this.endDate.set(end);
      this.loadDashboardData();
    }
  }

  onStartDateChange(start: string): void {
    if (start) {
      this.startDate.set(start);
      this.loadDashboardData();
    }
  }

  onEndDateChange(end: string): void {
    if (end) {
      this.endDate.set(end);
      this.loadDashboardData();
    }
  }

  dismissError(): void {
    this.errorMessage.set(null);
  }

  initChart(): void {
    if (!this.chartRef?.nativeElement) return;

    const points = this.chartData();
    const labels = points.map((p) => p.label);
    const values = points.map((p) => p.value);

    if (this.chart) {
      this.chart.updateOptions({
        series: [{ name: 'Revenue', data: values }],
        xaxis: { categories: labels }
      });
      return;
    }

    this.chart = new ApexCharts(this.chartRef.nativeElement, {
      series: [{ name: 'Revenue', data: values }],
      chart: {
        type: 'area',
        height: 250,
        toolbar: { show: false },
        background: 'transparent',
        fontFamily: 'Inter, sans-serif'
      },
      colors: ['#7C3AED'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.5,
          opacityTo: 0.03,
          stops: [0, 85, 100]
        }
      },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      grid: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } }
      },
      xaxis: {
        categories: labels,
        labels: { style: { colors: '#958DA1', fontSize: '11px', fontFamily: 'Inter' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#958DA1', fontSize: '11px', fontFamily: 'Inter' },
          formatter: (val: number) => `$${val.toLocaleString()}`
        }
      },
      tooltip: {
        theme: 'dark',
        x: { show: true },
        y: { formatter: (val: number) => `$${val.toLocaleString()}` }
      },
      markers: {
        size: 0,
        hover: { size: 5, sizeOffset: 3 }
      }
    });

    this.chart.render();
  }

  setTimeframe(tf: 'day' | 'week' | 'month'): void {
    this.selectedTimeframe.set(tf);
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'pending':
      case 'tracked':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
    }
  }

  getChangePosNeg(change: number): string {
    return change >= 0
      ? `text-emerald-400`
      : `text-red-400`;
  }
}
