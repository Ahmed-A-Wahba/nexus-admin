import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PublisherService } from '../../core/services/publisher.service';
import { PublisherItem, PublisherStatus } from '../../core/models/publisher.model';

@Component({
  selector: 'app-publishers',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe, DatePipe, RouterModule],
  templateUrl: './publishers.component.html',
  styleUrls: ['./publishers.component.css']
})
export class PublishersComponent implements OnInit, OnDestroy {
  private readonly publisherService = inject(PublisherService);
  private readonly router = inject(Router);

  // Expose enum values to template
  readonly PublisherStatus = PublisherStatus;

  // ─── Table Data ───────────────────────────────────────────────
  publishers: PublisherItem[] = [];
  totalCount   = 0;
  pendingCount = 0;

  // ─── Filtering & Pagination ───────────────────────────────────
  selectedStatus: PublisherStatus | null = null;
  pageNumber  = 1;
  pageSize    = 10;
  searchTerm  = '';

  // ─── UI State ─────────────────────────────────────────────────
  isLoading       = false;
  actionLoadingIds = new Set<string>();
  toastMessage: { text: string; type: 'success' | 'error' } | null = null;
  confirmDialog: {
    publisherId: string;
    companyName: string;
    action: 'approve' | 'reject';
  } | null = null;

  // ─── Computed ─────────────────────────────────────────────────
  get totalPages(): number { return Math.ceil(this.totalCount / this.pageSize) || 1; }
  get startItem(): number  { return this.totalCount === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1; }
  get endItem(): number    { return Math.min(this.pageNumber * this.pageSize, this.totalCount); }

  // ─── Search Debounce ──────────────────────────────────────────
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  private toastTimeout?: ReturnType<typeof setTimeout>;

  // ─────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.searchSub = this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe((q) => {
        this.searchTerm = q;
        this.pageNumber = 1;
        this.loadPublishers();
      });

    this.loadPublishers();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  // ─────────────────────────────────────────────────────────────
  // Data Loading
  // ─────────────────────────────────────────────────────────────
  loadPublishers(): void {
    this.isLoading = true;

    this.publisherService
      .getPublishers(
        this.pageNumber,
        this.pageSize,
        this.searchTerm || undefined,
        this.selectedStatus !== null ? this.selectedStatus : undefined
      )
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.isSuccess && res.data) {
            this.publishers   = res.data.items;
            this.totalCount   = res.data.totalCount;
            this.pendingCount = res.data.pendingCount;
          } else {
            this.publishers = [];
            this.totalCount = 0;
          }
        },
        error: () => {
          this.isLoading = false;
          this.showToast('Failed to load publishers.', 'error');
        }
      });
  }

  // ─────────────────────────────────────────────────────────────
  // Tab Filtering
  // ─────────────────────────────────────────────────────────────
  changeTab(status: PublisherStatus | null): void {
    this.selectedStatus = status;
    this.pageNumber     = 1;
    this.loadPublishers();
  }

  // ─────────────────────────────────────────────────────────────
  // Search
  // ─────────────────────────────────────────────────────────────
  onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
  }

  // ─────────────────────────────────────────────────────────────
  // Approve / Reject (called directly from template)
  // ─────────────────────────────────────────────────────────────
  approve(publisherId: string): void {
    const pub = this.publishers.find((p) => p.publisherId === publisherId);
    if (pub) this.openConfirm(pub, 'approve');
  }

  reject(publisherId: string): void {
    const pub = this.publishers.find((p) => p.publisherId === publisherId);
    if (pub) this.openConfirm(pub, 'reject');
  }

  openConfirm(publisher: PublisherItem, action: 'approve' | 'reject'): void {
    this.confirmDialog = { publisherId: publisher.publisherId, companyName: publisher.companyName, action };
  }

  closeConfirm(): void {
    this.confirmDialog = null;
  }

  confirmAction(): void {
    if (!this.confirmDialog) return;
    const { publisherId, companyName, action } = this.confirmDialog;
    this.closeConfirm();
    action === 'approve'
      ? this.executeApprove(publisherId, companyName)
      : this.executeReject(publisherId, companyName);
  }

  private executeApprove(publisherId: string, companyName: string): void {
    this.actionLoadingIds = new Set([...this.actionLoadingIds, publisherId]);
    const pub = this.publishers.find((p) => p.publisherId === publisherId);
    const wasPending = pub ? this.isPending(pub.status) : false;

    this.publisherService.approvePublisher(publisherId).subscribe({
      next: (res) => {
        this.actionLoadingIds = new Set([...this.actionLoadingIds].filter((id) => id !== publisherId));
        if (res.isSuccess) {
          this.publishers = this.publishers.map((p) =>
            p.publisherId === publisherId ? { ...p, status: PublisherStatus.Active } : p
          );
          if (wasPending) {
            this.pendingCount = Math.max(0, this.pendingCount - 1);
          }
          this.showToast(
            wasPending
              ? `"${companyName}" approved and set to Active.`
              : `"${companyName}" re-enabled and set to Active.`,
            'success'
          );
        } else {
          this.showToast(`Failed to activate "${companyName}".`, 'error');
        }
      },
      error: () => {
        this.actionLoadingIds = new Set([...this.actionLoadingIds].filter((id) => id !== publisherId));
        this.showToast('Network error. Please try again.', 'error');
      }
    });
  }

  private executeReject(publisherId: string, companyName: string): void {
    this.actionLoadingIds = new Set([...this.actionLoadingIds, publisherId]);

    this.publisherService.rejectPublisher(publisherId).subscribe({
      next: (res) => {
        this.actionLoadingIds = new Set([...this.actionLoadingIds].filter((id) => id !== publisherId));
        if (res.isSuccess) {
          this.publishers = this.publishers.map((p) =>
            p.publisherId === publisherId ? { ...p, status: PublisherStatus.Disabled } : p
          );
          this.showToast(`"${companyName}" rejected and disabled.`, 'success');
        } else {
          this.showToast(`Failed to reject "${companyName}".`, 'error');
        }
      },
      error: () => {
        this.actionLoadingIds = new Set([...this.actionLoadingIds].filter((id) => id !== publisherId));
        this.showToast('Network error. Please try again.', 'error');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Icon Actions (Active / Disabled rows)
  // ─────────────────────────────────────────────────────────────
  viewPublisher(publisherId: string): void {
    this.router.navigate(['/publishers', publisherId]);
  }
  copyPublisherLink(publisher: PublisherItem): void {
    const link = `${window.location.origin}/publishers/${publisher.publisherId}`;
    navigator.clipboard.writeText(link).then(() =>
      this.showToast(`Link copied for "${publisher.companyName}".`, 'success')
    );
  }
  deletePublisher(publisher: PublisherItem): void { this.openConfirm(publisher, 'reject'); }

  // ─────────────────────────────────────────────────────────────
  // Pagination
  // ─────────────────────────────────────────────────────────────
  goToPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages && newPage !== this.pageNumber) {
      this.pageNumber = newPage;
      this.loadPublishers();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // Status helpers — handle C# enum as 0-based int, 1-based int,
  // PascalCase string ("PendingApproval"), or camelCase string
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

  getInitials(name: string): string {
    if (!name) return 'PB';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }

  showToast(text: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage = { text, type };
    this.toastTimeout = setTimeout(() => (this.toastMessage = null), 4500);
  }
}
