import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ApiService } from '../../../core/services/api.service';
import { CartService } from '../../../core/services/cart.service';
import { Product } from '../../../core/models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { CurrencyDisplayPipe } from '../../../shared/pipes/currency-display.pipe';
import { selectIsLoggedIn } from '../../../core/store/auth/auth.selectors';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, CurrencyDisplayPipe],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-10">
      @if (loading) {
        <div class="flex gap-8">
          <div class="w-full md:w-1/2 bg-bmod-gray-100 aspect-[3/4] animate-pulse"></div>
          <div class="flex-1 space-y-4">
            <div class="h-8 bg-bmod-gray-100 animate-pulse rounded w-3/4"></div>
            <div class="h-4 bg-bmod-gray-100 animate-pulse rounded w-1/4"></div>
            <div class="h-20 bg-bmod-gray-100 animate-pulse rounded"></div>
          </div>
        </div>
      } @else if (product) {
        <div class="flex flex-col md:flex-row gap-8 lg:gap-16">
          <!-- Image Section -->
          <div class="w-full md:w-1/2">
            <div class="product-image-frame aspect-[3/4] mb-3">
              <img [src]="activeImage || 'assets/placeholder.webp'" [alt]="product.name" class="product-image" />
            </div>
            <!-- Thumbnails (max 3) -->
            <div class="flex gap-2">
              @for (img of product.images; track img.id) {
                <button
                  (click)="activeImage = img.url"
                  [class.border-bmod-black]="activeImage === img.url"
                  [class.border-bmod-gray-200]="activeImage !== img.url"
                  class="product-image-frame w-20 h-24 border-2 flex-shrink-0">
                  <img [src]="img.url" [alt]="img.alt_text || product.name" class="product-image" />
                </button>
              }
            </div>
          </div>

          <!-- Product Info -->
          <div class="flex-1">
            <p class="text-xs text-bmod-gray-400 tracking-widest uppercase mb-2">
              {{ product.category }} · {{ product.gender_target }}
            </p>
            <h1 class="font-display text-3xl md:text-4xl font-bold mb-3">{{ product.name }}</h1>
            <p class="text-2xl font-semibold mb-6">{{ product.price_ngn | currencyDisplay }}</p>

            <p class="text-bmod-gray-700 text-sm leading-relaxed mb-6">{{ product.description }}</p>

            <!-- Size selector -->
            @if (product.sizes && product.sizes.length > 0) {
              <div class="mb-6">
                <label class="block text-xs tracking-widest uppercase mb-3">Size</label>
                <div class="flex gap-2 flex-wrap">
                  @for (size of product.sizes; track size) {
                    <button
                      (click)="selectedSize = size"
                      [class.bg-bmod-black]="selectedSize === size"
                      [class.text-white]="selectedSize === size"
                      [class.border-bmod-gray-200]="selectedSize !== size"
                      class="border px-4 py-2 text-sm hover:bg-bmod-black hover:text-white hover:border-bmod-black transition-colors">
                      {{ size }}
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Stock status -->
            @if (!product.is_in_stock) {
              <div class="mb-4 text-sm text-red-500 font-medium">Currently out of stock</div>
            }

            <!-- Add to cart -->
            @if (product.is_in_stock) {
              <div class="flex gap-3 mb-6">
                <div class="flex items-center border border-bmod-gray-200">
                  <button (click)="quantity = Math.max(1, quantity - 1)" class="px-3 py-2 text-lg hover:bg-bmod-gray-100">−</button>
                  <span class="px-4 py-2 text-sm min-w-[3rem] text-center">{{ quantity }}</span>
                  <button (click)="quantity = Math.min(10, quantity + 1)" class="px-3 py-2 text-lg hover:bg-bmod-gray-100">+</button>
                </div>
                <button
                  (click)="addToCart()"
                  [disabled]="addingToCart || (product.sizes?.length! > 0 && !selectedSize)"
                  class="btn-primary flex-1">
                  {{ addingToCart ? 'Adding...' : 'Add to Cart' }}
                </button>
              </div>
            }

            @if (cartMessage) {
              <p class="text-sm text-green-600 mb-4">{{ cartMessage }}</p>
            }

            <!-- Wishlist -->
            <button (click)="toggleWishlist()" class="btn-outline w-full">
              {{ inWishlist ? '♥ Remove from Wishlist' : '♡ Save to Wishlist' }}
            </button>
          </div>
        </div>

        <!-- Complete the Look -->
        @if (product.outfit_tags && product.outfit_tags.length > 0) {
          <section class="mt-16">
            <h2 class="font-display text-2xl font-bold mb-6">Complete the Look</h2>
            <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              @for (tag of product.outfit_tags; track tag.id) {
                <div class="flex-shrink-0 w-40 md:w-48">
                  <app-product-card [product]="tag" />
                </div>
              }
            </div>
          </section>
        }

        <!-- Recommended -->
        @if (product.recommended && product.recommended.length > 0) {
          <section class="mt-16">
            <h2 class="font-display text-2xl font-bold mb-6">You May Also Like</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              @for (rec of product.recommended; track rec.id) {
                <app-product-card [product]="rec" />
              }
            </div>
          </section>
        }
      }
    </div>
  `,
})
export class ProductDetailComponent implements OnInit {
  @Input() id!: string;

  private api = inject(ApiService);
  private cartService = inject(CartService);
  private store = inject(Store);
  private router = inject(Router);

  product: Product | null = null;
  loading = true;
  activeImage = '';
  selectedSize: string | null = null;
  quantity = 1;
  addingToCart = false;
  cartMessage = '';
  inWishlist = false;
  Math = Math;

  ngOnInit() {
    this.api.getProduct(this.id).subscribe({
      next: p => {
        this.product = p;
        this.activeImage = p.images[0]?.url ?? '';
        this.loading = false;
      },
      error: () => this.router.navigate(['/shop']),
    });
  }

  addToCart() {
    this.store.select(selectIsLoggedIn).subscribe(isLoggedIn => {
      if (!isLoggedIn) { this.router.navigate(['/auth/login']); return; }
    }).unsubscribe();

    if (this.product!.sizes?.length && !this.selectedSize) return;
    this.addingToCart = true;
    this.cartService.addItem(this.product!.id, this.selectedSize, this.quantity).subscribe({
      next: () => {
        this.addingToCart = false;
        this.cartMessage = 'Added to cart!';
        setTimeout(() => this.cartMessage = '', 3000);
      },
      error: () => { this.addingToCart = false; this.cartMessage = 'Failed to add to cart.'; },
    });
  }

  toggleWishlist() {
    this.inWishlist = !this.inWishlist;
  }
}
