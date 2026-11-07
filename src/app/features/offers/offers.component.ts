import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { OfferService } from '../../core/services/offer.service';
import {
  AdminOffersResponse,
  OffersSummary,
  OfferItemDto
} from '../../core/models/offer.model';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.css']
})
export class OffersComponent implements OnInit, OnDestroy {
  private readonly offerService = inject(OfferService);

  // ── Data State ──────────────────────────────────────────────
  data: AdminOffersResponse | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  // ── Filter State ────────────────────────────────────────────
  searchTerm = '';
  selectedStatus = 'all';
  selectedSource = 'all';

  // ── Pagination State ────────────────────────────────────────
  pageNumber = 1;
  pageSize = 10;

  // ── Toggle Loading per Offer ────────────────────────────────
  togglingOfferId: string | null = null;

  // ── Toast ───────────────────────────────────────────────────
  toastMessage: { text: string; type: 'success' | 'error' } | null = null;
  private toastTimeout?: ReturnType<typeof setTimeout>;

  private loadSub?: Subscription;

  ngOnInit(): void {
    this.loadOffers();
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  // ── Load ─────────────────────────────────────────────────────
  loadOffers(force = false): void {
    if (this.isLoading && !force) return;
    this.isLoading = true;
    this.errorMessage = null;

    this.loadSub?.unsubscribe();
    this.loadSub = this.offerService
      .getOffers(
        this.pageNumber,
        this.pageSize,
        this.searchTerm || undefined,
        this.selectedStatus !== 'all' ? this.selectedStatus : null,
        this.selectedSource !== 'all' ? this.selectedSource : null
      )
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.isSuccess && res.data) {
            this.data = res.data;
          } else {
            this.errorMessage = res.error?.description || 'Failed to load offers.';
          }
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Network error. Please try again.';
        }
      });
  }

  applyFilters(): void {
    this.pageNumber = 1;
    this.loadOffers(true);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.selectedSource = 'all';
    this.pageNumber = 1;
    this.loadOffers(true);
  }

  // ── Toggle Status ─────────────────────────────────────────────
  toggleStatus(offer: OfferItemDto): void {
    if (this.togglingOfferId) return;
    this.togglingOfferId = offer.offerId;

    this.offerService.toggleOfferStatus(offer.offerId, offer.status).subscribe({
      next: (res) => {
        this.togglingOfferId = null;
        if (res.isSuccess) {
          const newStatus = offer.status.toUpperCase() === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
          if (this.data) {
            this.data = {
              ...this.data,
              offers: this.data.offers.map((o) =>
                o.offerId === offer.offerId ? { ...o, status: newStatus } : o
              )
            };
          }
          this.showToast(
            `"${offer.name}" is now ${newStatus === 'ACTIVE' ? 'visible' : 'hidden'}.`,
            'success'
          );
        } else {
          this.showToast('Failed to update offer status.', 'error');
        }
      },
      error: () => {
        this.togglingOfferId = null;
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
    this.loadOffers(true);
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
    const delta = 1;
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
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
  isActive(status: string): boolean {
    return status?.toUpperCase() === 'ACTIVE';
  }

  getLogoInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  trackByOfferId(_: number, offer: OfferItemDto): string {
    return offer.offerId;
  }
}
