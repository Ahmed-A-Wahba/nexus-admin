import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PublisherService } from '../../../core/services/publisher.service';
import { PaymentDetailsResponse } from '../../../core/models/publisher.model';

@Component({
  selector: 'app-publisher-payment-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './publisher-payment-details.component.html',
  styleUrls: ['./publisher-payment-details.component.css']
})
export class PublisherPaymentDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publisherService = inject(PublisherService);

  publisherId = '';
  details: PaymentDetailsResponse | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  // Toast feedback
  toastMessage: { text: string; type: 'success' | 'error' } | null = null;
  private toastTimeout?: ReturnType<typeof setTimeout>;

  // Track which field was just copied (for inline icon feedback)
  copiedField: string | null = null;

  private routeSub?: Subscription;

  // Define the ordered fields to display in the grid
  readonly fields: { key: keyof PaymentDetailsResponse; label: string }[] = [
    { key: 'method',        label: 'METHOD' },
    { key: 'bankName',      label: 'BANK NAME' },
    { key: 'accountHolder', label: 'ACCOUNT HOLDER' },
    { key: 'accountNumber', label: 'ACCOUNT NUMBER' },
    { key: 'swiftCode',     label: 'SWIFT / BIC' },
    { key: 'routingNumber', label: 'ROUTING NUMBER' },
    { key: 'currency',      label: 'CURRENCY' },
    { key: 'bankAddress',   label: 'BANK ADDRESS' }
  ];

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.publisherId = id;
        this.loadDetails(id);
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

  loadDetails(id: string): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.publisherService.getPaymentDetails(id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.isSuccess && res.data) {
          this.details = res.data;
        } else {
          this.errorMessage = res.error?.description || 'Payment details not found.';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load payment details. Please try again.';
      }
    });
  }

  copyToClipboard(value: string | undefined, fieldKey: string): void {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      this.copiedField = fieldKey;
      this.showToast(`${fieldKey} copied to clipboard.`, 'success');
      setTimeout(() => {
        if (this.copiedField === fieldKey) this.copiedField = null;
      }, 2000);
    }).catch(() => {
      this.showToast('Failed to copy to clipboard.', 'error');
    });
  }

  showToast(text: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage = { text, type };
    this.toastTimeout = setTimeout(() => (this.toastMessage = null), 3500);
  }

  getFieldValue(key: keyof PaymentDetailsResponse): string {
    if (!this.details) return '—';
    const val = this.details[key];
    return val ? String(val) : '—';
  }

  goBack(): void {
    this.router.navigate(['/publishers', this.publisherId]);
  }
}
