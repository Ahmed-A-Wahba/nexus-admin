import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  readonly forgotPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  get emailControl() {
    return this.forgotPasswordForm.get('email');
  }

  get emailErrorMessage(): string | null {
    const ctrl = this.emailControl;
    if (ctrl && ctrl.touched && ctrl.errors) {
      if (ctrl.errors['required']) {
        return 'Email is required.';
      }
      if (ctrl.errors['email']) {
        return 'Please enter a valid email address.';
      }
    }
    return null;
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const email = this.forgotPasswordForm.value.email.trim();

    this.authService.forgotPasswordSendCode(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = `Verification code sent to ${email}!`;
      },
      error: (err) => {
        this.isLoading = false;
        const errCode = err?.error?.error?.code ?? err?.error?.code;
        const errDesc = err?.error?.error?.description ?? err?.error?.description;

        if (errCode === 'ForgotPasswordCodeAlreadySent') {
          this.errorMessage = 'A verification code was already sent recently. Please check your inbox or wait before requesting again.';
        } else {
          this.errorMessage = errDesc ?? 'Failed to send verification code. Please try again.';
        }
      }
    });
  }

  proceedToResetPassword(): void {
    this.router.navigate(['/reset-password']);
  }
}
