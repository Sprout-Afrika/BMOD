import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { CartService } from '../../core/services/cart.service';
import { selectCart } from '../../core/store/cart/cart.selectors';
import { Cart, CartItem } from '../../core/models';
import { CurrencyDisplayPipe } from '../../shared/pipes/currency-display.pipe';
import { loadCart } from '../../core/store/cart/cart.actions';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyDisplayPipe],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-10">
      <h1 class="font-display text-3xl font-bold mb-8">Your Cart</h1>

      @if (loading) {
        <div class="space-y-4">
          @for (i of [1,2,3]; track i) {
            <div class="h-24 bg-bmod-gray-100 animate-pulse"></div>
          }
        </div>
      } @else if (!cart || cart.items.length === 0) {
        <div class="text-center py-20">
          <p class="text-bmod-gray-400 text-lg mb-6">Your cart is empty</p>
          <a routerLink="/shop" class="btn-primary inline-block">Continue Shopping</a>
        </div>
      } @else {
        <div class="flex flex-col lg:flex-row gap-8">
          <!-- Items -->
          <div class="flex-1 space-y-4">
            @for (item of cart.items; track item.id) {
              <div class="flex gap-4 border-b border-bmod-gray-200 pb-4">
                <div class="product-image-frame w-20 h-24 flex-shrink-0" [routerLink]="['/shop', item.product_id]">
                  <img
                    [src]="item.product.images[0]?.url || 'assets/placeholder.webp'"
                    [alt]="item.product.name"
                    class="product-image"
                  />
                </div>
                <div class="flex-1">
                  <a [routerLink]="['/shop', item.product_id]" class="font-medium hover:text-bmod-accent">
                    {{ item.product.name }}
                  </a>
                  @if (item.size) {
                    <p class="text-xs text-bmod-gray-400 mt-0.5">Size: {{ item.size }}</p>
                  }
                  <p class="text-sm font-semibold mt-1">{{ item.line_total_ngn | currencyDisplay }}</p>

                  <div class="flex items-center gap-4 mt-3">
                    <div class="flex items-center border border-bmod-gray-200">
                      <button (click)="decreaseQty(item)" class="px-2 py-1 text-sm hover:bg-bmod-gray-100">−</button>
                      <span class="px-3 py-1 text-sm">{{ item.quantity }}</span>
                      <button (click)="increaseQty(item)" class="px-2 py-1 text-sm hover:bg-bmod-gray-100">+</button>
                    </div>
                    <button (click)="removeItem(item.id)" class="text-xs text-bmod-gray-400 hover:text-red-500 underline">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            }

            <div class="flex justify-between pt-2">
              <button (click)="clearCart()" class="text-xs text-bmod-gray-400 hover:text-red-500 underline">
                Clear cart
              </button>
              <a routerLink="/shop" class="text-xs text-bmod-gray-400 hover:text-bmod-black underline">
                Continue shopping
              </a>
            </div>
          </div>

          <!-- Summary -->
          <div class="lg:w-72">
            <div class="border border-bmod-gray-200 p-6">
              <h2 class="font-medium text-lg mb-4">Order Summary</h2>
              <div class="flex justify-between text-sm mb-2">
                <span>Items ({{ cart.item_count }})</span>
                <span>{{ cart.total_ngn | currencyDisplay }}</span>
              </div>
              @if (cart.total_usd !== null) {
                <div class="flex justify-between text-xs text-bmod-gray-400 mb-4">
                  <span>Approx.</span>
                  <span>~\${{ cart.total_usd!.toFixed(2) }} USD</span>
                </div>
              }
              <div class="border-t border-bmod-gray-200 my-4"></div>
              <div class="flex justify-between font-semibold mb-6">
                <span>Total</span>
                <span>{{ cart.total_ngn | currencyDisplay }}</span>
              </div>
              <a routerLink="/cart/review" class="btn-primary w-full block text-center">
                Review & Checkout
              </a>
              <p class="text-xs text-bmod-gray-400 text-center mt-3">Checkout via WhatsApp</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CartComponent implements OnInit {
  private store = inject(Store);
  private cartService = inject(CartService);

  cart: Cart | null = null;
  loading = true;

  ngOnInit() {
    this.store.dispatch(loadCart());
    this.store.select(selectCart).subscribe(c => {
      this.cart = c;
      this.loading = false;
    });
  }

  decreaseQty(item: CartItem) {
    if (item.quantity <= 1) { this.removeItem(item.id); return; }
    this.cartService.updateItem(item.id, item.quantity - 1).subscribe();
  }

  increaseQty(item: CartItem) {
    this.cartService.updateItem(item.id, Math.min(item.quantity + 1, 100)).subscribe();
  }

  removeItem(id: string) {
    this.cartService.removeItem(id).subscribe();
  }

  clearCart() {
    if (confirm('Clear your entire cart?')) this.cartService.clearCart().subscribe();
  }
}
