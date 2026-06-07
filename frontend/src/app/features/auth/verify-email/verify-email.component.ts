import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="text-center max-w-md">
        @if (loading) {
          <div class="text-bmod-gray-400">Verifying your email...</div>
        } @else if (success) {
          <div class="text-5xl mb-4">✓</div>
          <h2 class="font-display text-2xl font-bold mb-2">Email Verified!</h2>
          <p class="text-bmod-gray-400 mb-6">Your account is ready. Sign in to start shopping.</p>
          <a routerLink="/auth/login" class="btn-primary">Sign In</a>
        } @else {
          <div class="text-5xl mb-4">✗</div>
          <h2 class="font-display text-2xl font-bold mb-2">Verification Failed</h2>
          <p class="text-bmod-gray-400 mb-6">{{ error }}</p>
          <a routerLink="/auth/login" class="btn-outline">Back to Login</a>
        }
      </div>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  loading = true;
  success = false;
  error = 'Invalid or expired verification link.';

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading = false;
      return;
    }
    this.authService.verifyEmail(token).subscribe({
      next: () => { this.loading = false; this.success = true; },
      error: (err) => { this.loading = false; this.error = err.error?.detail ?? this.error; },
    });
  }
}
