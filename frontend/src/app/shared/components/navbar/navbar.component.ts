import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { map } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { selectIsLoggedIn, selectRole } from '../../../core/store/auth/auth.selectors';
import { selectCartItemCount as cartCount } from '../../../core/store/cart/cart.selectors';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="fixed top-0 left-0 right-0 z-50 bg-bmod-white border-b border-bmod-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <a routerLink="/" class="font-display text-2xl font-bold tracking-wider text-bmod-black">
            BMOD
          </a>

          <!-- Nav Links -->
          <div class="hidden md:flex items-center gap-8">
            <a routerLink="/shop" routerLinkActive="border-b border-bmod-black"
               class="text-sm tracking-widest uppercase hover:text-bmod-accent transition-colors pb-0.5">
              Shop
            </a>
            @if ((isStaff$ | async)) {
              <a routerLink="/cms" class="text-sm tracking-widest uppercase hover:text-bmod-accent transition-colors">CMS</a>
            }
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-4">
            @if (isLoggedIn$ | async) {
              <a routerLink="/wishlist" class="p-2 hover:text-bmod-accent transition-colors" title="Wishlist">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </a>
              <a routerLink="/cart" class="relative p-2 hover:text-bmod-accent transition-colors" title="Cart">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
                @if ((cartItemCount$ | async) ?? 0 > 0) {
                  <span class="absolute -top-1 -right-1 bg-bmod-black text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {{ cartItemCount$ | async }}
                  </span>
                }
              </a>
              <button (click)="logout()" class="text-sm tracking-widest uppercase hover:text-bmod-accent transition-colors">
                Logout
              </button>
            } @else {
              <a routerLink="/auth/login" class="text-sm tracking-widest uppercase hover:text-bmod-accent transition-colors">
                Login
              </a>
            }
          </div>
        </div>
      </div>
    </nav>
    <!-- Spacer for fixed navbar -->
    <div class="h-16"></div>
  `,
})
export class NavbarComponent {
  private store = inject(Store);
  private authService = inject(AuthService);

  isLoggedIn$ = this.store.select(selectIsLoggedIn);
  isStaff$ = this.store.select(selectRole).pipe(map(role => role === 'STAFF' || role === 'ADMIN'));
  cartItemCount$ = this.store.select(cartCount);

  logout() {
    this.authService.logout().subscribe();
  }
}
