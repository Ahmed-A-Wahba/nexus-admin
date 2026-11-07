import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.css'
})
export class AdminSidebarComponent {
  private readonly authService = inject(AuthService);

  readonly adminEmail = computed(() => {
    return this.authService.currentUserEmail() || this.authService.getUserEmail() || '';
  });

  readonly adminInitial = computed(() => {
    const email = this.adminEmail();
    if (!email) return 'A';
    return email.charAt(0).toUpperCase();
  });

  logout(): void {
    this.authService.logout();
  }
}
