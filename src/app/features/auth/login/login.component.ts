import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isLoading = false;
  errorMessage: string | null = null;
  isSuccess = false;

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  get emailErrorMessage(): string | null {
    const ctrl = this.emailControl;
    if (ctrl && ctrl.touched && ctrl.errors) {
      if (ctrl.errors['required']) {
        return 'Email is required.';
      }
      if (ctrl.errors['email']) {
        return 'Invalid email format.';
      }
    }
    return null;
  }

  get passwordErrorMessage(): string | null {
    const ctrl = this.passwordControl;
    if (ctrl && ctrl.touched && ctrl.errors) {
      if (ctrl.errors['required']) {
        return 'Password is required.';
      }
    }
    return null;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.isSuccess = false;
        this.errorMessage = err?.error?.error?.description ?? 'Invalid email or password.';
      }
    });
  }
}
