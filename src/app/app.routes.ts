import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'otp',
    loadComponent: () =>
      import('./features/auth/verify-otp/verify-otp.component').then((m) => m.VerifyOtpComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/layouts/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'publishers',
        loadComponent: () =>
          import('./features/publishers/publishers.component').then((m) => m.PublishersComponent)
      },
      {
        path: 'publishers/:id',
        loadComponent: () =>
          import('./features/publishers/publisher-details/publisher-details.component').then(
            (m) => m.PublisherDetailsComponent
          )
      },
      {
        path: 'publishers/:id/payment-details',
        loadComponent: () =>
          import('./features/publishers/publisher-payment-details/publisher-payment-details.component').then(
            (m) => m.PublisherPaymentDetailsComponent
          )
      },
      {
        path: 'offers',
        loadComponent: () =>
          import('./features/offers/offers.component').then((m) => m.OffersComponent)
      },
      {
        path: 'redeem-codes',
        loadComponent: () =>
          import('./features/redeem-codes/redeem-codes.component').then((m) => m.RedeemCodesComponent)
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users.component').then((m) => m.UsersComponent)
      },
      {
        path: 'payouts',
        loadComponent: () =>
          import('./features/payouts/payouts.component').then((m) => m.PayoutsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
