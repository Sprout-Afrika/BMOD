import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Product } from '../../../core/models';
import { CurrencyDisplayPipe } from '../../pipes/currency-display.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyDisplayPipe],
  template: `
    <div class="product-card" [routerLink]="['/shop', product.id]">
      <div class="relative overflow-hidden bg-bmod-gray-100">
        <img
          [src]="product.images[0]?.url || 'assets/placeholder.webp'"
          [alt]="product.images[0]?.alt_text || product.name"
          class="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        @if (!product.is_in_stock) {
          <span class="absolute top-2 left-2 badge bg-bmod-gray-700 text-white">Sold Out</span>
        }
        @if (product.is_featured) {
          <span class="absolute top-2 right-2 badge bg-bmod-accent text-bmod-black">Featured</span>
        }
      </div>
      <div class="pt-3 pb-1">
        <p class="text-xs text-bmod-gray-400 uppercase tracking-widest mb-0.5">{{ product.category }}</p>
        <h3 class="text-sm font-medium leading-tight mb-1">{{ product.name }}</h3>
        <p class="text-sm font-semibold">{{ product.price_ngn | currencyDisplay }}</p>
        @if (product.sizes && product.sizes.length > 0) {
          <div class="flex gap-1 mt-1.5 flex-wrap">
            @for (size of product.sizes; track size) {
              <span class="text-xs border border-bmod-gray-200 px-1.5 py-0.5">{{ size }}</span>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
}
