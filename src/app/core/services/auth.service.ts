import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResult } from '../models/api-result.model';
import { VerifyOtpResponse } from '../models/auth.model';

export const TOKEN_KEY = 'nexus_admin_token';
export const REFRESH_TOKEN_KEY = 'nexus_admin_refresh';
export const USER_EMAIL_KEY = 'nexus_admin_email';
export const SAVED_ADMIN_EMAIL_KEY = 'nexus_admin_logged_email';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  readonly currentUserEmail = signal<string>(this.resolveUserEmail());

  private resolveUserEmail(): string {
    const sessionEmail = sessionStorage.getItem(USER_EMAIL_KEY);
    if (sessionEmail) return sessionEmail;

    const savedEmail = localStorage.getItem(SAVED_ADMIN_EMAIL_KEY) || sessionStorage.getItem(SAVED_ADMIN_EMAIL_KEY);
    if (savedEmail) return savedEmail;

    const tokenEmail = this.getEmailFromJwt(this.getToken());
    if (tokenEmail) return tokenEmail;

    return '';
  }

  private getEmailFromJwt(token: string | null): string | null {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return (
        payload.email ||
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
        payload.sub ||
        null
      );
    } catch {
      return null;
    }
  }

  login(email: string, password: string): Observable<void> {
    return this.apiService.post<any>('/admin/auth/login', { email, password }).pipe(
      map((response) => {
        sessionStorage.setItem(USER_EMAIL_KEY, email);
        localStorage.setItem(SAVED_ADMIN_EMAIL_KEY, email);
        this.currentUserEmail.set(email);

        if (response?.token || response?.data?.token) {
          sessionStorage.setItem(TOKEN_KEY, response.token || response.data.token);
        }
        this.router.navigate(['/otp']);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  verifyOtp(email: string, code: string): Observable<any> {
    return this.apiService.post<any>('/admin/auth/verify-otp', { email, code }).pipe(
      map((response) => {
        const accessToken = response?.accessToken || response?.data?.accessToken;
        const refreshToken = response?.refreshToken || response?.data?.refreshToken;
        if (accessToken) {
          localStorage.setItem(TOKEN_KEY, accessToken);
          sessionStorage.setItem(TOKEN_KEY, accessToken);
        }
        if (refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
        if (email) {
          localStorage.setItem(SAVED_ADMIN_EMAIL_KEY, email);
          this.currentUserEmail.set(email);
        }
        sessionStorage.removeItem(USER_EMAIL_KEY);
        return response;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  forgotPasswordSendCode(email: string): Observable<any> {
    return this.apiService.post<any>('/admin/auth/forgot-password/send-code', { email }).pipe(
      map((response) => {
        sessionStorage.setItem(USER_EMAIL_KEY, email);
        this.currentUserEmail.set(email);
        return response;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  resetPassword(email: string, code: string, newPassword: string): Observable<any> {
    return this.apiService.post<any>('/admin/auth/forgot-password/reset', { email, code, newPassword }).pipe(
      map((response) => {
        sessionStorage.removeItem(USER_EMAIL_KEY);
        return response;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  resendVerificationCode(email: string): Observable<any> {
    return this.apiService.post<any>('/admin/auth/resend-code', { email }).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.apiService.post<any>('/admin/auth/refresh-token', { refreshToken }).pipe(
      map((response) => {
        const newAccessToken = response?.accessToken || response?.data?.accessToken;
        const newRefreshToken = response?.refreshToken || response?.data?.refreshToken;
        if (newAccessToken) {
          localStorage.setItem(TOKEN_KEY, newAccessToken);
          sessionStorage.setItem(TOKEN_KEY, newAccessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
          sessionStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        }
        return response;
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY) || '';

    if (refreshToken) {
      this.apiService.post<any>('/admin/logout', { refreshToken }).pipe(
        catchError(() => of(null))
      ).subscribe({
        next: () => this.clearAuthStateAndNavigate(),
        error: () => this.clearAuthStateAndNavigate()
      });
    } else {
      this.clearAuthStateAndNavigate();
    }
  }

  private clearAuthStateAndNavigate(): void {
    sessionStorage.clear();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SAVED_ADMIN_EMAIL_KEY);
    this.currentUserEmail.set('');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!(localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY));
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  }

  getUserEmail(): string {
    return this.currentUserEmail() || this.resolveUserEmail();
  }
}
