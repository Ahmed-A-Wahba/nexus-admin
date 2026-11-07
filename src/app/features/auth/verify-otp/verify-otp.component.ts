import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  QueryList,
  ViewChildren,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css'
})
export class VerifyOtpComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  userEmail: string = '';
  isLoading = false;
  isResending = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // Timer state
  timerSeconds = 300; // 5 minutes
  private timerInterval: any = null;

  readonly otpForm: FormGroup = this.fb.group({
    digit0: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
    digit1: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
    digit2: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
    digit3: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
    digit4: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
    digit5: ['', [Validators.required, Validators.pattern('^[0-9]$')]]
  });

  ngOnInit(): void {
    const email = this.authService.getUserEmail();
    if (!email) {
      this.router.navigate(['/login']);
      return;
    }
    this.userEmail = email;
    this.startTimer();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.focusInput(0);
    }, 100);
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  get maskedEmail(): string {
    if (!this.userEmail || !this.userEmail.includes('@')) {
      return 'a•••••r@nexus.io';
    }
    const [name, domain] = this.userEmail.split('@');
    if (name.length <= 2) {
      return `${name.charAt(0)}•••••@${domain}`;
    }
    return `${name.charAt(0)}•••••${name.charAt(name.length - 1)}@${domain}`;
  }

  get formattedTimer(): string {
    const minutes = Math.floor(this.timerSeconds / 60);
    const seconds = this.timerSeconds % 60;
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  get isOtpComplete(): boolean {
    const code = this.getCombinedCode();
    return code.length === 6 && /^\d{6}$/.test(code);
  }

  getCombinedCode(): string {
    const val = this.otpForm.value;
    return `${val.digit0 ?? ''}${val.digit1 ?? ''}${val.digit2 ?? ''}${val.digit3 ?? ''}${val.digit4 ?? ''}${val.digit5 ?? ''}`;
  }

  focusInput(index: number): void {
    const inputsArray = this.otpInputs?.toArray();
    if (inputsArray && inputsArray[index]) {
      inputsArray[index].nativeElement.focus();
      inputsArray[index].nativeElement.select();
    }
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value.length > 1) {
      // If single input received multiple chars without paste event
      const cleanDigit = value.replace(/\D/g, '').slice(-1);
      this.otpForm.get(`digit${index}`)?.setValue(cleanDigit);
    }

    if (input.value && index < 5) {
      this.focusInput(index + 1);
    }

    if (this.isOtpComplete) {
      this.onSubmit();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const currentControl = this.otpForm.get(`digit${index}`);

    if (event.key === 'Backspace') {
      if (!currentControl?.value && index > 0) {
        this.focusInput(index - 1);
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < 5) {
      this.focusInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') ?? '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (!digits) return;

    for (let i = 0; i < 6; i++) {
      const char = digits[i] ?? '';
      this.otpForm.get(`digit${i}`)?.setValue(char);
    }

    const focusIdx = Math.min(digits.length, 5);
    this.focusInput(focusIdx);

    if (digits.length === 6) {
      this.onSubmit();
    }
  }

  startTimer(): void {
    this.stopTimer();
    this.timerSeconds = 300;
    this.timerInterval = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
      } else {
        this.stopTimer();
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resendCode(): void {
    if (this.isLoading || this.isResending) return;

    this.isResending = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.authService.resendVerificationCode(this.userEmail).subscribe({
      next: () => {
        this.isResending = false;
        this.startTimer();
        this.successMessage = 'A new verification code has been sent to your email.';
      },
      error: (err) => {
        this.isResending = false;
        this.errorMessage =
          err?.error?.error?.description ??
          err?.error?.description ??
          'Verification code already sent. Please wait before requesting another.';
      }
    });
  }

  onSubmit(): void {
    const code = this.getCombinedCode();
    if (code.length !== 6) {
      this.errorMessage = 'Please enter all 6 digits of the verification code.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.authService.verifyOtp(this.userEmail, code).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response?.accessToken) {
          this.router.navigate(['/']);
        } else {
          this.errorMessage = response?.error?.description ?? 'Invalid verification code.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.error?.description ?? err?.error?.description ?? 'The verification code is invalid or expired.';
      }
    });
  }
}
