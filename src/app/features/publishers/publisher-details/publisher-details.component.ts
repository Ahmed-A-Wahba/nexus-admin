import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PublisherService } from '../../../core/services/publisher.service';
import {
  PublisherDetailsResponse,
  PublisherStatus,
  PublisherRevenueStatsResponse,
  RevenueChartDataPoint,
  TransferRecordDto,
  OfferPerformanceResponse,
  OfferPerformanceItemDto
} from '../../../core/models/publisher.model';

@Component({
  selector: 'app-publisher-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './publisher-details.component.html',
  styleUrls: ['./publisher-details.component.css']
})
export class PublisherDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publisherService = inject(PublisherService);

  // Expose enum to template
  readonly PublisherStatus = PublisherStatus;

  // Data & State
  publisherId = '';
  publisher: PublisherDetailsResponse | null = null;
  isLoading = true;
  actionLoading = false;
  errorMessage: string | null = null;

  // Active Tab: 'general' | 'revenue' | 'performance'
  activeTab: 'general' | 'revenue' | 'performance' = 'general';

  // Revenue Statistics Tab State
  revenueStats: PublisherRevenueStatsResponse | null = null;
  revenueLoading = false;
  revenueError: string | null = null;
  revenueTimeframe: '30d' | '90d' | '180d' | 'year' | 'all' = '180d';
  chargebackToggling = false;
  hoveredBarIndex: number | null = null;

  // Offer Performance Tab State
  perfData: OfferPerformanceResponse | null = null;
  perfLoading = false;
  perfError: string | null = null;
  perfSearch = '';
  perfSortBy = 'revenue';
  perfFromDate = '';
  perfToDate = '';
  perfPageNumber = 1;
  perfPageSize = 10;

  // Toast
  toastMessage: { text: string; type: 'success' | 'error' } | null = null;
  private toastTimeout?: ReturnType<typeof setTimeout>;

  // Confirm Dialog
  confirmDialog: {
    action: 'approve' | 'reject';
    title: string;
    message: string;
  } | null = null;

  private routeSub?: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.publisherId = id;
        this.loadPublisher(id);
      } else {
        this.errorMessage = 'No Publisher ID specified in route.';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  loadPublisher(id: string): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.publisherService.getPublisherDetails(id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.isSuccess && res.data) {
          this.publisher = res.data;
        } else {
          this.errorMessage = res.error?.description || 'Publisher not found.';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load publisher details. Please try again.';
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Tab Switching & Revenue Statistics
  // ─────────────────────────────────────────────────────────────
  setTab(tab: 'general' | 'revenue' | 'performance'): void {
    this.activeTab = tab;
    if (tab === 'revenue' && !this.revenueStats && !this.revenueLoading && this.publisherId) {
      this.loadRevenueStats();
    }
    if (tab === 'performance' && !this.perfData && !this.perfLoading && this.publisherId) {
      this.loadOfferPerformance();
    }
  }

  loadRevenueStats(force = false): void {
    if (!this.publisherId) return;
    if (this.revenueLoading && !force) return;

    this.revenueLoading = true;
    this.revenueError = null;

    let fromDate: string | null = null;
    let toDate: string | null = null;
    const now = new Date();

    if (this.revenueTimeframe === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      fromDate = d.toISOString();
      toDate = now.toISOString();
    } else if (this.revenueTimeframe === '90d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      fromDate = d.toISOString();
      toDate = now.toISOString();
    } else if (this.revenueTimeframe === '180d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 180);
      fromDate = d.toISOString();
      toDate = now.toISOString();
    } else if (this.revenueTimeframe === 'year') {
      const d = new Date(now.getFullYear(), 0, 1);
      fromDate = d.toISOString();
      toDate = now.toISOString();
    }
    // 'all' keeps fromDate and toDate null

    this.publisherService
      .getPublisherRevenueStats(this.publisherId, fromDate, toDate)
      .subscribe({
        next: (res) => {
          this.revenueLoading = false;
          if (res.isSuccess && res.data) {
            this.revenueStats = res.data;
          } else {
            this.revenueError =
              res.error?.description || 'Failed to load revenue statistics.';
          }
        },
        error: () => {
          this.revenueLoading = false;
          this.revenueError =
            'Network error while loading revenue statistics. Please try again.';
        }
      });
  }

  setTimeframe(tf: '30d' | '90d' | '180d' | 'year' | 'all'): void {
    if (this.revenueTimeframe === tf) return;
    this.revenueTimeframe = tf;
    this.loadRevenueStats(true);
  }

  toggleChargebackPolicy(): void {
    if (!this.publisherId || !this.revenueStats || this.chargebackToggling) return;
    const current = this.revenueStats.publisherAbsorbsChargebacks;
    const nextVal = !current;
    this.chargebackToggling = true;

    this.publisherService
      .updateChargebackResponsibility(this.publisherId, nextVal)
      .subscribe({
        next: (res) => {
          this.chargebackToggling = false;
          if (res.isSuccess) {
            if (this.revenueStats) {
              this.revenueStats = {
                ...this.revenueStats,
                publisherAbsorbsChargebacks: nextVal
              };
            }
            this.showToast(
              nextVal
                ? 'Chargeback policy updated: Publisher absorbs chargebacks.'
                : 'Chargeback policy updated: Platform absorbs chargebacks.',
              'success'
            );
          } else {
            this.showToast(
              res.error?.description || 'Failed to update chargeback policy.',
              'error'
            );
          }
        },
        error: () => {
          this.chargebackToggling = false;
          this.showToast('Network error updating chargeback policy.', 'error');
        }
      });
  }

  // SVG Chart Helpers
  getChartMax(): number {
    const chart = this.revenueStats?.revenueGrowthChart;
    if (!chart || chart.length === 0) return 1000;
    const max = Math.max(...chart.map((c) => c.value));
    return max <= 0 ? 1000 : max;
  }

  getBarHeight(value: number): number {
    const max = this.getChartMax();
    const chartHeight = 170; // max SVG bar height
    const ratio = Math.min(1, Math.max(0, value / max));
    return Math.max(4, Math.round(ratio * chartHeight));
  }

  getBarY(value: number): number {
    const baseline = 200; // SVG baseline for bars
    return baseline - this.getBarHeight(value);
  }

  getGridLineY(fraction: number): number {
    const baseline = 200;
    const chartHeight = 170;
    return baseline - Math.round(fraction * chartHeight);
  }

  formatCompactCurrency(val: number): string {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${val.toFixed(0)}`;
  }

  getBarX(index: number, total: number): number {
    if (total <= 0) return 60;
    const availableWidth = 700;
    const offsetLeft = 65;
    const step = availableWidth / total;
    const barWidth = this.getBarWidth(total);
    return offsetLeft + index * step + (step - barWidth) / 2;
  }

  getBarWidth(total: number): number {
    if (total <= 0) return 40;
    const availableWidth = 700;
    const step = availableWidth / total;
    return Math.min(48, Math.max(20, step * 0.55));
  }

  getGridLabel(fraction: number): string {
    const max = this.getChartMax();
    return this.formatCompactCurrency(max * fraction);
  }

  getHoveredItem(): RevenueChartDataPoint | null {
    if (
      this.hoveredBarIndex === null ||
      !this.revenueStats?.revenueGrowthChart ||
      !this.revenueStats.revenueGrowthChart[this.hoveredBarIndex]
    ) {
      return null;
    }
    return this.revenueStats.revenueGrowthChart[this.hoveredBarIndex];
  }




  // ─────────────────────────────────────────────────────────────
  // Offer Performance Tab
  // ─────────────────────────────────────────────────────────────
  loadOfferPerformance(force = false): void {
    if (!this.publisherId) return;
    if (this.perfLoading && !force) return;

    this.perfLoading = true;
    this.perfError = null;

    this.publisherService
      .getPublisherOfferPerformance(
        this.publisherId,
        this.perfSearch || undefined,
        this.perfSortBy || undefined,
        this.perfFromDate || null,
        this.perfToDate || null,
        this.perfPageNumber,
        this.perfPageSize
      )
      .subscribe({
        next: (res) => {
          this.perfLoading = false;
          if (res.isSuccess && res.data) {
            this.perfData = res.data;
          } else {
            this.perfError = res.error?.description || 'Failed to load offer performance data.';
          }
        },
        error: () => {
          this.perfLoading = false;
          this.perfError = 'Network error while loading offer performance. Please try again.';
        }
      });
  }

  applyPerfFilter(): void {
    this.perfPageNumber = 1;
    this.loadOfferPerformance(true);
  }

  perfChangePage(page: number): void {
    if (!this.perfData) return;
    const totalPages = this.getPerfTotalPages();
    if (page < 1 || page > totalPages) return;
    this.perfPageNumber = page;
    this.loadOfferPerformance(true);
  }

  getPerfTotalPages(): number {
    if (!this.perfData) return 0;
    return Math.max(1, Math.ceil(this.perfData.totalOffersCount / this.perfPageSize));
  }

  getPerfStartItem(): number {
    return ((this.perfPageNumber - 1) * this.perfPageSize) + 1;
  }

  getPerfEndItem(): number {
    if (!this.perfData) return 0;
    return Math.min(this.perfPageNumber * this.perfPageSize, this.perfData.totalOffersCount);
  }

  getPerfPageNumbers(): number[] {
    const total = this.getPerfTotalPages();
    const current = this.perfPageNumber;
    const pages: number[] = [];
    const delta = 1;
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    if (pages[0] > 1) {
      pages.unshift(-1); // ellipsis
      pages.unshift(1);
    }
    if (pages[pages.length - 1] < total) {
      pages.push(-1); // ellipsis
      pages.push(total);
    }
    return pages;
  }

  formatLastActivity(dateStr?: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Status Helpers
  // ─────────────────────────────────────────────────────────────
  isPending(status: any): boolean {
    return (
      status === 0 ||
      status === PublisherStatus.PendingApproval ||
      status === 'PendingApproval' ||
      status === 'pendingApproval'
    );
  }

  isActive(status: any): boolean {
    return (
      status === 1 ||
      status === PublisherStatus.Active ||
      status === 'Active' ||
      status === 'active'
    );
  }

  isDisabled(status: any): boolean {
    return (
      status === 2 ||
      status === 3 ||
      status === PublisherStatus.Disabled ||
      status === 'Disabled' ||
      status === 'disabled'
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Approve / Reject Actions
  // ─────────────────────────────────────────────────────────────
  openApproveConfirm(): void {
    if (!this.publisher) return;
    const isCurrentlyPending = this.isPending(this.publisher.status);
    this.confirmDialog = {
      action: 'approve',
      title: isCurrentlyPending ? 'Approve Publisher?' : 'Re-enable Publisher?',
      message: isCurrentlyPending
        ? `"${this.publisher.tradingName}" will be set to Active and allowed to publish offers.`
        : `"${this.publisher.tradingName}" will be re-enabled and restored to Active status.`
    };
  }

  openRejectConfirm(): void {
    if (!this.publisher) return;
    const isCurrentlyPending = this.isPending(this.publisher.status);
    this.confirmDialog = {
      action: 'reject',
      title: isCurrentlyPending ? 'Reject Application?' : 'Disable Publisher?',
      message: isCurrentlyPending
        ? `"${this.publisher.tradingName}" application will be rejected and disabled.`
        : `"${this.publisher.tradingName}" will be disabled and lose access to the platform.`
    };
  }

  closeConfirm(): void {
    this.confirmDialog = null;
  }

  confirmAction(): void {
    if (!this.confirmDialog || !this.publisher) return;
    const action = this.confirmDialog.action;
    this.closeConfirm();

    if (action === 'approve') {
      this.executeApprove();
    } else {
      this.executeReject();
    }
  }

  private executeApprove(): void {
    if (!this.publisher) return;
    this.actionLoading = true;
    const name = this.publisher.tradingName;
    const wasPending = this.isPending(this.publisher.status);

    this.publisherService.approvePublisher(this.publisherId).subscribe({
      next: (res) => {
        this.actionLoading = false;
        if (res.isSuccess) {
          if (this.publisher) {
            this.publisher = { ...this.publisher, status: PublisherStatus.Active };
          }
          this.showToast(
            wasPending ? `"${name}" approved successfully.` : `"${name}" re-enabled successfully.`,
            'success'
          );
        } else {
          this.showToast(`Failed to activate "${name}".`, 'error');
        }
      },
      error: () => {
        this.actionLoading = false;
        this.showToast('Network error. Please try again.', 'error');
      }
    });
  }

  private executeReject(): void {
    if (!this.publisher) return;
    this.actionLoading = true;
    const name = this.publisher.tradingName;
    const wasPending = this.isPending(this.publisher.status);

    this.publisherService.rejectPublisher(this.publisherId).subscribe({
      next: (res) => {
        this.actionLoading = false;
        if (res.isSuccess) {
          if (this.publisher) {
            this.publisher = { ...this.publisher, status: PublisherStatus.Disabled };
          }
          this.showToast(
            wasPending ? `"${name}" application rejected.` : `"${name}" disabled.`,
            'success'
          );
        } else {
          this.showToast(`Failed to disable "${name}".`, 'error');
        }
      },
      error: () => {
        this.actionLoading = false;
        this.showToast('Network error. Please try again.', 'error');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  copyToClipboard(text: string, label: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`${label} copied to clipboard.`, 'success');
    });
  }

  getInitials(name?: string): string {
    if (!name || !name.trim()) return '-';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }

  showToast(text: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage = { text, type };
    this.toastTimeout = setTimeout(() => (this.toastMessage = null), 4000);
  }

  goBack(): void {
    this.router.navigate(['/publishers']);
  }
}
