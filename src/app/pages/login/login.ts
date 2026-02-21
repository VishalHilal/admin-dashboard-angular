import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {

  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  login() {
    if (this.email && this.password) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.login(this.email, this.password).subscribe({
        next: (response) => {
          this.isLoading = false;
          // Redirect to intended URL or dashboard
          const returnUrl = this.getQueryParam('returnUrl') || '/dashboard';
          this.router.navigate([returnUrl]);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.error || 'Login failed. Please try again.';
        }
      });
    }
  }

  // Demo credentials for testing
  fillDemoCredentials(role: 'admin' | 'manager' | 'user'): void {
    const demoCredentials = {
      admin: { email: 'john@example.com', password: 'admin123' },
      manager: { email: 'alice@example.com', password: 'manager123' },
      user: { email: 'jane@example.com', password: 'user123' }
    };

    const credentials = demoCredentials[role];
    this.email = credentials.email;
    this.password = credentials.password;
  }

  private getQueryParam(param: string): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
  }
}
