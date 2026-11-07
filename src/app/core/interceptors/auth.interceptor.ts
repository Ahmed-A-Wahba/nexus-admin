import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const isAuthEndpoint =
    req.url.includes('/admin/auth/login') ||
    req.url.includes('/admin/auth/verify-otp') ||
    req.url.includes('/admin/auth/refresh-token') ||
    req.url.includes('/admin/auth/forgot-password') ||
    req.url.includes('/admin/auth/resend-code');

  let authReq = req;
  if (!isAuthEndpoint) {
    const token = authService.getToken();
    if (token) {
      authReq = addTokenHeader(req, token);
    }
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthEndpoint) {
        return handle401Error(authReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function handle401Error(
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response: any) => {
        isRefreshing = false;
        const newAccessToken =
          response?.accessToken || response?.data?.accessToken || authService.getToken();

        if (newAccessToken) {
          refreshTokenSubject.next(newAccessToken);
          return next(addTokenHeader(request, newAccessToken));
        }

        authService.logout();
        return throwError(() => new Error('Refresh token succeeded but no access token returned.'));
      }),
      catchError((refreshError) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        authService.logout();
        return throwError(() => refreshError);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => {
        return next(addTokenHeader(request, token!));
      })
    );
  }
}
