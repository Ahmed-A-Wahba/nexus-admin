import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PayoutService } from '../../core/services/payout.service';
import { PayoutStats, PayoutItem, PagedPayoutsResponse } from '../../core/models/payout.model';

@Component({
  selector: 'app-payouts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payouts.component.html',
  styleUrls: ['./payouts.component.css']
})
export class PayoutsComponent implements OnInit, OnDestroy {
  private readonly payoutService = inject(PayoutService);

  // ── Stats ─────────────────────────────────────────────────────
  stats: PayoutStats | null = null;
  statsLoading = true;
  statsError: string | null = null;

  // ── Payouts List ──────────────────────────────────────────────
  data: PagedPayoutsResponse | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  // ── Filters ───────────────────────────────────────────────────
  filterPartnerId = '';
  filterStatus = 'all';
  filterStartDate = '';
  filterEndDate = '';

  readonly statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'PAID', label: 'Paid' },
    { value: 'FAILED', label: 'Failed' }
  ];

  // ── Pagination ────────────────────────────────────────────────
  pageNumber = 1;
  pageSize = 10;

  // ── Toast ─────────────────────────────────────────────────────
  toastMessage: { text: string; type: 'success' | 'error' } | null = null;
  private toastTimeout?: ReturnType<typeof setTimeout>;
  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.loadStats();
    this.loadPayouts();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  // ── Stats ─────────────────────────────────────────────────────
  loadStats(): void {
    this.statsLoading = true;
    const sub = this.payoutService.getPayoutStats().subscribe({
      next: (res) => {
        this.statsLoading = false;
        if (res.isSuccess && res.data) {
          this.stats = res.data;
        } else {
          this.statsError = res.error?.description || 'Failed to load stats.';
        }
      },
      error: () => {
        this.statsLoading = false;
        this.statsError = 'Failed to load payout stats.';
      }
    });
    this.subs.push(sub);
  }

  // ── Payouts List ──────────────────────────────────────────────
  loadPayouts(force = false): void {
    if (this.isLoading && !force) return;
    this.isLoading = true;
    this.errorMessage = null;

    const sub = this.payoutService.getPayouts(
      this.filterPartnerId || undefined,
      this.filterStatus !== 'all' ? this.filterStatus : null,
      this.filterStartDate || undefined,
      this.filterEndDate || undefined,
      this.pageNumber,
      this.pageSize
    ).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.isSuccess && res.data) {
          this.data = res.data;
        } else {
          this.errorMessage = res.error?.description || 'Failed to load payouts.';
          this.showToast(this.errorMessage!, 'error');
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Network error. Please try again.';
        this.showToast(this.errorMessage, 'error');
      }
    });
    this.subs.push(sub);
  }

  applyFilters(): void {
    this.pageNumber = 1;
    this.loadPayouts(true);
  }

  resetFilters(): void {
    this.filterPartnerId = '';
    this.filterStatus = 'all';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.pageNumber = 1;
    this.loadPayouts(true);
  }

  // ── Accordion ─────────────────────────────────────────────────
  toggleExpand(payout: PayoutItem): void {
    payout.isExpanded = !payout.isExpanded;
  }

  // ── Pagination ────────────────────────────────────────────────
  changePage(page: number): void {
    if (!this.data) return;
    const total = this.getTotalPages();
    if (page < 1 || page > total) return;
    this.pageNumber = page;
    this.loadPayouts(true);
  }

  getTotalPages(): number {
    if (!this.data) return 0;
    return Math.max(1, Math.ceil(this.data.totalCount / this.pageSize));
  }

  getStartItem(): number { return (this.pageNumber - 1) * this.pageSize + 1; }
  getEndItem(): number {
    if (!this.data) return 0;
    return Math.min(this.pageNumber * this.pageSize, this.data.totalCount);
  }

  getPageNumbers(): (number | -1)[] {
    const total = this.getTotalPages();
    const current = this.pageNumber;
    const pages: (number | -1)[] = [];
    for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) pages.push(i);
    if ((pages[0] as number) > 1) {
      if ((pages[0] as number) > 2) pages.unshift(-1);
      pages.unshift(1);
    }
    const last = pages[pages.length - 1] as number;
    if (last < total) {
      if (last < total - 1) pages.push(-1);
      pages.push(total);
    }
    return pages;
  }

  // ── Toast ─────────────────────────────────────────────────────
  showToast(text: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage = { text, type };
    this.toastTimeout = setTimeout(() => (this.toastMessage = null), 4000);
  }

  // ── Style helpers ─────────────────────────────────────────────
  statusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PAID':      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'SCHEDULED': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'FAILED':    return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:          return 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30';
    }
  }

  statusDot(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PAID':      return 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]';
      case 'SCHEDULED': return 'bg-amber-400';
      case 'FAILED':    return 'bg-red-400';
      default:          return 'bg-zinc-500';
    }
  }

  methodIcon(method: string): string {
    const m = method?.toUpperCase();
    if (m?.includes('BANK') || m?.includes('WIRE')) return '🏦';
    if (m?.includes('PAYPAL')) return '💳';
    return '💰';
  }

  publisherInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  formatDate(ds: string): string {
    if (!ds) return '—';
    const d = new Date(ds);
    return isNaN(d.getTime()) ? ds :
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatNextBatch(ds: string): string {
    if (!ds) return '—';
    const d = new Date(ds);
    return isNaN(d.getTime()) ? ds :
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  trackById(_: number, item: PayoutItem): string { return item.payoutId; }
}
