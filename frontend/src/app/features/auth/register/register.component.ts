import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 bg-bmod-gray-100">
      <div class="w-full max-w-md bg-white p-8">
        @if (!success) {
          <h1 class="font-display text-3xl font-bold mb-1">Create Account</h1>
          <p class="text-bmod-gray-400 text-sm mb-8">Join BMOD for exclusive access</p>

          @if (error) {
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-6">{{ error }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="mb-4">
              <label class="block text-xs tracking-widest uppercase mb-2">Email</label>
              <input type="email" formControlName="email" class="input-field" placeholder="you@example.com" />
            </div>
            <div class="mb-4">
              <label class="block text-xs tracking-widest uppercase mb-2">Password</label>
              <input type="password" formControlName="password" class="input-field" placeholder="Min. 8 characters" />
            </div>
            <div class="mb-6">
              <label class="block text-xs tracking-widest uppercase mb-2">Confirm Password</label>
              <input type="password" formControlName="confirm" class="input-field" placeholder="Repeat password" />
              @if (form.errors?.['mismatch'] && form.get('confirm')?.dirty) {
                <p class="text-red-500 text-xs mt-1">Passwords do not match</p>
              }
            </div>
            <button type="submit" class="btn-primary w-full" [disabled]="form.invalid || loading">
              {{ loading ? 'Creating account...' : 'Create Account' }}
            </button>
          </form>

          <p class="mt-6 text-sm text-center text-bmod-gray-400">
            Already have an account?
            <a routerLink="/auth/login" class="text-bmod-black underline ml-1">Sign in</a>
          </p>
        } @else {
          <div class="text-center py-8">
            <div class="text-5xl mb-4">✓</div>
            <h2 class="font-display text-2xl font-bold mb-2">Check your email</h2>
            <p class="text-bmod-gray-400 text-sm">We've sent a verification link to <strong>{{ registeredEmail }}</strong></p>
            <a routerLink="/auth/login" class="btn-primary inline-block mt-6">Go to Login</a>
          </div>
        }
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    {
      validators: (g) => g.get('password')?.value !== g.get('confirm')?.value ? { mismatch: true } : null,
    }
  );

  error = '';
  loading = false;
  success = false;
  registeredEmail = '';

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    const { email, password } = this.form.value;
    this.authService.register(email!, password!).subscribe({
      next: () => {
        this.success = true;
        this.registeredEmail = email!;
      },
      error: (err) => {
        this.error = err.error?.detail ?? 'Registration failed.';
        this.loading = false;
      },
    });
  }
}
