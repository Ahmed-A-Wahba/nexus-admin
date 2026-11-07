import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import {
  UserProfileResponse,
  ActivityLogResponse,
  SupportTicketsResponse,
  ActivityItemDto,
  SupportTicketItemDto
} from '../../core/models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);

  // ── Search ────────────────────────────────────────────────────
  searchTerm = '';
  searchLoading = false;
  searchError: string | null = null;

  // ── Profile Data ──────────────────────────────────────────────
  profileData: UserProfileResponse | null = null;

  // ── Activity Log ──────────────────────────────────────────────
  activityData: ActivityLogResponse | null = null;
  activityLoading = false;
  activityError: string | null = null;
  selectedEventType = 'all';
  activityStartDate = '';
  activityEndDate = '';
  activityPage = 1;
  activityPageSize = 10;

  readonly eventTypes = [
    { value: 'all', label: 'All Events' },
    { value: 'OFFER_COMPLETED', label: 'Offer Completed' },
    { value: 'REDEMPTION', label: 'Redemption' },
    { value: 'SUPPORT_CREDIT', label: 'Support Credit' },
    { value: 'VPN_BLOCK', label: 'VPN Block' },
    { value: 'BALANCE_ADJUSTMENT', label: 'Balance Adjustment' }
  ];

  // ── Support Tickets ───────────────────────────────────────────
  ticketsData: SupportTicketsResponse | null = null;
  ticketsLoading = false;
  ticketsError: string | null = null;
  ticketsPage = 1;
  ticketsPageSize = 10;
  expandedTicketId: string | null = null;

  // ── Toast ─────────────────────────────────────────────────────
  toastMessage: { text: string; type: 'success' | 'error' } | null = null;
  private toastTimeout?: ReturnType<typeof setTimeout>;

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.loadTickets();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  // ── Search / Profile ──────────────────────────────────────────
  search(): void {
    if (!this.searchTerm.trim()) return;
    this.searchLoading = true;
    this.searchError = null;
    this.profileData = null;
    this.activityData = null;

    const sub = this.userService.getUserProfile(this.searchTerm.trim()).subscribe({
      next: (res) => {
        this.searchLoading = false;
        if (res.isSuccess && res.data) {
          this.profileData = res.data;
          this.activityPage = 1;
          this.loadActivity(true);
        } else {
          this.searchError = res.error?.description || 'User not found.';
          this.showToast(this.searchError!, 'error');
        }
      },
      error: () => {
        this.searchLoading = false;
        this.searchError = 'Network error. Please try again.';
        this.showToast(this.searchError, 'error');
      }
    });
    this.subs.push(sub);
  }

  // ── Activity Log ──────────────────────────────────────────────
  loadActivity(force = false): void {
    if (!this.profileData || (this.activityLoading && !force)) return;
    this.activityLoading = true;
    this.activityError = null;

    const sub = this.userService.getActivityLog(
      this.profileData.user.id,
      this.selectedEventType !== 'all' ? this.selectedEventType : null,
      this.activityStartDate || undefined,
      this.activityEndDate || undefined,
      this.activityPage,
      this.activityPageSize
    ).subscribe({
      next: (res) => {
        this.activityLoading = false;
        if (res.isSuccess && res.data) {
          this.activityData = res.data;
        } else {
          this.activityError = res.error?.description || 'Failed to load activity log.';
        }
      },
      error: () => {
        this.activityLoading = false;
        this.activityError = 'Failed to load activity log.';
      }
    });
    this.subs.push(sub);
  }

  applyActivityFilters(): void {
    this.activityPage = 1;
    this.loadActivity(true);
  }

  changeActivityPage(page: number): void {
    if (!this.activityData) return;
    const total = Math.ceil(this.activityData.totalCount / this.activityPageSize);
    if (page < 1 || page > total) return;
    this.activityPage = page;
    this.loadActivity(true);
  }

  // ── Support Tickets (global — loads on init) ────────────────────
  loadTickets(force = false): void {
    if (this.ticketsLoading && !force) return;
    this.ticketsLoading = true;
    this.ticketsError = null;

    const sub = this.userService.getOpenSupportTickets(
      this.ticketsPage,
      this.ticketsPageSize
    ).subscribe({
      next: (res) => {
        this.ticketsLoading = false;
        if (res.isSuccess && res.data) {
          this.ticketsData = res.data;
        } else {
          this.ticketsError = res.error?.description || 'Failed to load tickets.';
        }
      },
      error: () => {
        this.ticketsLoading = false;
        this.ticketsError = 'Failed to load support tickets.';
      }
    });
    this.subs.push(sub);
  }

  changeTicketsPage(page: number): void {
    if (!this.ticketsData) return;
    const total = Math.ceil(this.ticketsData.totalCount / this.ticketsPageSize);
    if (page < 1 || page > total) return;
    this.ticketsPage = page;
    this.loadTickets(true);
  }

  toggleTicket(ticketId: string): void {
    this.expandedTicketId = this.expandedTicketId === ticketId ? null : ticketId;
  }

  // ── Pagination helpers ────────────────────────────────────────
  getTotalPages(total: number, size: number): number {
    return Math.max(1, Math.ceil(total / size));
  }

  getPageNumbers(current: number, totalPages: number): (number | -1)[] {
    const pages: (number | -1)[] = [];
    for (let i = Math.max(1, current - 1); i <= Math.min(totalPages, current + 1); i++) {
      pages.push(i);
    }
    if ((pages[0] as number) > 1) {
      if ((pages[0] as number) > 2) pages.unshift(-1);
      pages.unshift(1);
    }
    const last = pages[pages.length - 1] as number;
    if (last < totalPages) {
      if (last < totalPages - 1) pages.push(-1);
      pages.push(totalPages);
    }
    return pages;
  }

  getStartItem(page: number, size: number): number { return (page - 1) * size + 1; }
  getEndItem(page: number, size: number, total: number): number { return Math.min(page * size, total); }

  // ── Toast ─────────────────────────────────────────────────────
  showToast(text: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage = { text, type };
    this.toastTimeout = setTimeout(() => (this.toastMessage = null), 4000);
  }

  // ── Style helpers ─────────────────────────────────────────────
  statusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'BLOCKED':   return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'INACTIVE':  return 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30';
      case 'OPEN':      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'PENDING':   return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'RESOLVED':  return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'CLOSED':    return 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30';
      default:          return 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30';
    }
  }

  eventTypeClass(eventType: string): string {
    switch (eventType?.toUpperCase()) {
      case 'REDEMPTION':       return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'OFFER_COMPLETED':  return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'VPN_BLOCK':        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'SUPPORT_CREDIT':   return 'bg-purple-500/10 text-purple-300 border border-purple-500/20';
      case 'BALANCE_ADJUSTMENT': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:                 return 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30';
    }
  }

  pointsClass(pts: number): string {
    if (pts > 0) return 'text-emerald-400 font-bold';
    if (pts < 0) return 'text-rose-400 font-bold';
    return 'text-zinc-600';
  }

  formatTimestamp(ts: string): string {
    if (!ts) return '—';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '—' :
      d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatDate(ds: string): string {
    if (!ds) return '—';
    const d = new Date(ds);
    return isNaN(d.getTime()) ? '—' :
      d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  trackById(_: number, item: { ticketId?: string; id?: string }): string {
    return item.ticketId ?? item.id ?? '';
  }

  trackByIndex(i: number): number { return i; }
}
