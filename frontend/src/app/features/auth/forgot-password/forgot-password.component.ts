import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 bg-bmod-gray-100">
      <div class="w-full max-w-md bg-white p-8">
        @if (step === 'email') {
          <h1 class="font-display text-3xl font-bold mb-1">Forgot Password</h1>
          <p class="text-bmod-gray-400 text-sm mb-8">Enter your email to receive a reset code</p>
          <form [formGroup]="emailForm" (ngSubmit)="sendOtp()">
            <div class="mb-4">
              <label class="block text-xs tracking-widest uppercase mb-2">Email</label>
              <input type="email" formControlName="email" class="input-field" placeholder="you@example.com" />
            </div>
            <button type="submit" class="btn-primary w-full" [disabled]="emailForm.invalid || loading">
              {{ loading ? 'Sending...' : 'Send Code' }}
            </button>
          </form>
        } @else {
          <h1 class="font-display text-3xl font-bold mb-1">Reset Password</h1>
          <p class="text-bmod-gray-400 text-sm mb-8">Enter the 6-digit code sent to {{ emailForm.value.email }}</p>

          @if (error) {
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-4">{{ error }}</div>
          }

          <form [formGroup]="resetForm" (ngSubmit)="resetPassword()">
            <div class="mb-4">
              <label class="block text-xs tracking-widest uppercase mb-2">6-digit Code</label>
              <input type="text" formControlName="otp" class="input-field text-center text-2xl tracking-widest" maxlength="6" placeholder="000000" />
            </div>
            <div class="mb-6">
              <label class="block text-xs tracking-widest uppercase mb-2">New Password</label>
              <input type="password" formControlName="password" class="input-field" placeholder="Min. 8 characters" />
            </div>
            <button type="submit" class="btn-primary w-full" [disabled]="resetForm.invalid || loading">
              {{ loading ? 'Resetting...' : 'Reset Password' }}
            </button>
          </form>
        }
        <p class="mt-4 text-sm text-center">
          <a routerLink="/auth/login" class="text-bmod-gray-400 hover:text-bmod-black">Back to Login</a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  emailForm = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  resetForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  step: 'email' | 'reset' = 'email';
  loading = false;
  error = '';

  sendOtp() {
    if (this.emailForm.invalid) return;
    this.loading = true;
    this.authService.forgotPassword(this.emailForm.value.email!).subscribe({
      next: () => { this.step = 'reset'; this.loading = false; },
      error: () => { this.step = 'reset'; this.loading = false; },
    });
  }

  resetPassword() {
    if (this.resetForm.invalid) return;
    this.loading = true;
    this.error = '';
    const { otp, password } = this.resetForm.value;
    this.authService.resetPassword(this.emailForm.value.email!, otp!, password!).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (err) => { this.error = err.error?.detail ?? 'Reset failed.'; this.loading = false; },
    });
  }
}
