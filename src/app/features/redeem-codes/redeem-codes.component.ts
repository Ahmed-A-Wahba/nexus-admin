import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { RedeemCodeService } from '../../core/services/redeem-code.service';
import { RedeemCodesResponse, RedeemCodeItemDto, RedeemCodeStatus } from '../../core/models/redeem-code.model';

type TabStatus = 'All' | 'Active' | 'Used' | 'Expired' | 'Recalled';

@Component({
  selector: 'app-redeem-codes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './redeem-codes.component.html',
  styleUrls: ['./redeem-codes.component.css']
})
export class RedeemCodesComponent implements OnInit, OnDestroy {
  private readonly service = inject(RedeemCodeService);

  // ── Data ──────────────────────────────────────────────────────
  data: RedeemCodesResponse | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  // ── Filter State ──────────────────────────────────────────────
  searchTerm = '';
  activeTab: TabStatus = 'All';
  readonly tabs: TabStatus[] = ['All', 'Active', 'Used', 'Expired', 'Recalled'];

  // ── Pagination ────────────────────────────────────────────────
  pageNumber = 1;
  pageSize = 10;

  // ── Action State ──────────────────────────────────────────────
  recallingId: string | null = null;
  confirmRecallId: string | null = null;  // for confirmation dialog

  // ── Toast ─────────────────────────────────────────────────────
  toastMessage: { text: string; type: 'success' | 'error' } | null = null;
  private toastTimeout?: ReturnType<typeof setTimeout>;

  private loadSub?: Subscription;

  ngOnInit(): void {
    this.loadCodes();
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  // ── Load ──────────────────────────────────────────────────────
  loadCodes(force = false): void {
    if (this.isLoading && !force) return;
    this.isLoading = true;
    this.errorMessage = null;

    this.loadSub?.unsubscribe();
    this.loadSub = this.service
      .getCodes(
        this.pageNumber,
        this.pageSize,
        this.searchTerm || undefined,
        this.activeTab !== 'All' ? this.activeTab.toUpperCase() : null
      )
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.isSuccess && res.data) {
            this.data = res.data;
          } else {
            this.errorMessage = res.error?.description || 'Failed to load redeem codes.';
          }
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Network error. Please try again.';
        }
      });
  }

  selectTab(tab: TabStatus): void {
    this.activeTab = tab;
    this.pageNumber = 1;
    this.loadCodes(true);
  }

  applySearch(): void {
    this.pageNumber = 1;
    this.loadCodes(true);
  }

  // ── Recall ─────────────────────────────────────────────────────
  openRecallConfirm(id: string): void {
    this.confirmRecallId = id;
  }

  cancelRecall(): void {
    this.confirmRecallId = null;
  }

  confirmRecall(): void {
    if (!this.confirmRecallId) return;
    const id = this.confirmRecallId;
    this.confirmRecallId = null;
    this.recallingId = id;

    const code = this.data?.codes.find(c => c.id === id);
    this.service.recallCode(id).subscribe({
      next: (res) => {
        this.recallingId = null;
        if (res.isSuccess) {
          if (this.data) {
            this.data = {
              ...this.data,
              codes: this.data.codes.map(c => c.id === id ? { ...c, status: 'RECALLED' as RedeemCodeStatus } : c)
            };
          }
          this.showToast(`Code "${code?.code ?? id}" recalled successfully.`, 'success');
        } else {
          this.showToast('Failed to recall code. Please try again.', 'error');
        }
      },
      error: () => {
        this.recallingId = null;
        this.showToast('Network error. Please try again.', 'error');
      }
    });
  }

  // ── Pagination ────────────────────────────────────────────────
  changePage(page: number): void {
    if (!this.data) return;
    const total = this.getTotalPages();
    if (page < 1 || page > total) return;
    this.pageNumber = page;
    this.loadCodes(true);
  }

  getTotalPages(): number {
    if (!this.data) return 0;
    return Math.max(1, Math.ceil(this.data.totalCount / this.pageSize));
  }

  getStartItem(): number {
    return ((this.pageNumber - 1) * this.pageSize) + 1;
  }

  getEndItem(): number {
    if (!this.data) return 0;
    return Math.min(this.pageNumber * this.pageSize, this.data.totalCount);
  }

  getPageNumbers(): (number | -1)[] {
    const total = this.getTotalPages();
    const current = this.pageNumber;
    const pages: (number | -1)[] = [];
    for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
      pages.push(i);
    }
    if (pages[0] !== undefined && (pages[0] as number) > 1) {
      if ((pages[0] as number) > 2) pages.unshift(-1);
      pages.unshift(1);
    }
    const last = pages[pages.length - 1];
    if (last !== undefined && (last as number) < total) {
      if ((last as number) < total - 1) pages.push(-1);
      pages.push(total);
    }
    return pages;
  }

  // ── Toast ─────────────────────────────────────────────────────
  showToast(text: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage = { text, type };
    this.toastTimeout = setTimeout(() => (this.toastMessage = null), 3500);
  }

  // ── Helpers ───────────────────────────────────────────────────
  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  isExpired(dateStr?: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  statusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':   return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'USED':     return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'EXPIRED':  return 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30';
      case 'RECALLED': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:         return 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30';
    }
  }

  statusDotClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':   return 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]';
      case 'USED':     return 'bg-blue-400';
      case 'EXPIRED':  return 'bg-zinc-500';
      case 'RECALLED': return 'bg-rose-400';
      default:         return 'bg-zinc-500';
    }
  }

  trackById(_: number, item: RedeemCodeItemDto): string {
    return item.id;
  }
}
