import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { WishlistItem } from '../../core/models';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-10">
      <h1 class="font-display text-3xl font-bold mb-8">Wishlist</h1>

      @if (loading) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-bmod-gray-100 aspect-[3/4] animate-pulse"></div>
          }
        </div>
      } @else if (items.length === 0) {
        <div class="text-center py-20">
          <p class="text-bmod-gray-400 text-lg mb-6">Your wishlist is empty</p>
          <a routerLink="/shop" class="btn-primary inline-block">Browse Products</a>
        </div>
      } @else {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          @for (item of items; track item.id) {
            <div class="relative">
              <app-product-card [product]="item.product" />
              <button
                (click)="removeFromWishlist(item.product_id)"
                class="absolute top-2 right-2 bg-white/80 p-1.5 text-xs text-red-500 hover:bg-red-50 rounded-full z-10"
                title="Remove">
                ✕
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class WishlistComponent implements OnInit {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/wishlist`;

  items: WishlistItem[] = [];
  loading = true;

  ngOnInit() {
    this.http.get<{ items: WishlistItem[]; total: number }>(this.base).subscribe({
      next: res => { this.items = res.items; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  removeFromWishlist(productId: string) {
    this.http.delete(`${this.base}/${productId}`).subscribe(() => {
      this.items = this.items.filter(i => i.product_id !== productId);
    });
  }
}
