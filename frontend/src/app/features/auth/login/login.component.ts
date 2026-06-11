import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Store } from '@ngrx/store';
import { loadCart } from '../../../core/store/cart/cart.actions';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 bg-bmod-gray-100">
      <div class="w-full max-w-md bg-white p-8">
        <h1 class="font-display text-3xl font-bold mb-1">Welcome Back</h1>
        <p class="text-bmod-gray-400 text-sm mb-8">Sign in to your BMOD account</p>

        @if (error) {
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-6">{{ error }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label class="block text-xs tracking-widest uppercase mb-2">Email</label>
            <input type="email" formControlName="email" class="input-field" placeholder="you@example.com" />
          </div>
          <div class="mb-6">
            <label class="block text-xs tracking-widest uppercase mb-2">Password</label>
            <input type="password" formControlName="password" class="input-field" placeholder="••••••••" />
          </div>
          <button type="submit" class="btn-primary w-full" [disabled]="form.invalid || loading">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="mt-6 flex flex-col gap-2 text-sm text-center">
          <a routerLink="/auth/forgot-password" class="text-bmod-gray-400 hover:text-bmod-black">Forgot password?</a>
          <span class="text-bmod-gray-400">
            Don't have an account?
            <a routerLink="/auth/register" class="text-bmod-black underline ml-1">Register</a>
          </span>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private store = inject(Store);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  error = '';
  loading = false;

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    const { email, password } = this.form.value;
    this.authService.login(email!, password!).subscribe({
      next: user => {
        this.store.dispatch(loadCart());
        this.router.navigate([user.role === 'STAFF' || user.role === 'ADMIN' ? '/cms' : '/shop']);
      },
      error: (err) => {
        this.error = err.error?.detail ?? 'Login failed. Please try again.';
        this.loading = false;
      },
    });
  }
}
