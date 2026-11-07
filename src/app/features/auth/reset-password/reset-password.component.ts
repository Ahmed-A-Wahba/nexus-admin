import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  userEmail = '';
  isLoading = false;
  showNewPassword = false;
  showConfirmPassword = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  readonly resetForm: FormGroup = this.fb.group(
    {
      code: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(6)
        ]
      ],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
        ]
      ],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordsMatchValidator }
  );

  ngOnInit(): void {
    const savedEmail = this.authService.getUserEmail();
    if (!savedEmail) {
      this.router.navigate(['/forgot-password']);
      return;
    }
    this.userEmail = savedEmail;
  }

  get codeControl() {
    return this.resetForm.get('code');
  }

  get newPasswordControl() {
    return this.resetForm.get('newPassword');
  }

  get confirmPasswordControl() {
    return this.resetForm.get('confirmPassword');
  }

  get codeErrorMessage(): string | null {
    const ctrl = this.codeControl;
    if (ctrl && ctrl.touched && ctrl.errors) {
      if (ctrl.errors['required']) {
        return 'Verification code is required.';
      }
      if (ctrl.errors['minlength'] || ctrl.errors['maxlength']) {
        return 'Code must be exactly 6 characters.';
      }
    }
    return null;
  }

  get newPasswordErrorMessage(): string | null {
    const ctrl = this.newPasswordControl;
    if (ctrl && ctrl.touched && ctrl.errors) {
      if (ctrl.errors['required']) {
        return 'New password is required.';
      }
      if (ctrl.errors['minlength']) {
        return 'Password must be at least 8 characters long.';
      }
      if (ctrl.errors['pattern']) {
        return 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number.';
      }
    }
    return null;
  }

  get confirmPasswordErrorMessage(): string | null {
    const ctrl = this.confirmPasswordControl;
    if (ctrl && ctrl.touched) {
      if (ctrl.errors && ctrl.errors['required']) {
        return 'Please confirm your new password.';
      }
      if (this.resetForm.hasError('passwordMismatch')) {
        return 'Passwords do not match.';
      }
    }
    return null;
  }

  toggleShowNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const code = this.resetForm.value.code.trim();
    const newPassword = this.resetForm.value.newPassword;

    this.authService.resetPassword(this.userEmail, code, newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Password reset successfully! Redirecting to login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err?.error?.error?.description ??
          err?.error?.description ??
          'Invalid or expired verification code.';
      }
    });
  }
}
