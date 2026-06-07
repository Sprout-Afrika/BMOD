import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { CartService } from '../../../core/services/cart.service';
import { selectCart } from '../../../core/store/cart/cart.selectors';
import { Cart, CheckoutResponse } from '../../../core/models';
import { CurrencyDisplayPipe } from '../../../shared/pipes/currency-display.pipe';
import { loadCart } from '../../../core/store/cart/cart.actions';

@Component({
  selector: 'app-order-review',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, CurrencyDisplayPipe],
  template: `
    <div class="min-h-screen bg-bmod-white">
      <div class="mx-auto grid max-w-6xl grid-cols-1 border-x border-bmod-gray-200 lg:grid-cols-[13rem_1fr]">
        <aside class="hidden border-r border-bmod-gray-200 px-5 py-10 lg:block">
          <p class="mb-8 text-xs font-medium uppercase tracking-widest text-bmod-gray-400">Checkout</p>
          <ol class="space-y-5 text-sm">
            <li class="grid grid-cols-[2rem_1fr] items-start gap-3">
              <span class="border-t border-bmod-black pt-2 font-semibold">01</span>
              <span class="border-t border-bmod-gray-200 pt-2">Review cart</span>
            </li>
            <li class="grid grid-cols-[2rem_1fr] items-start gap-3">
              <span class="border-t border-bmod-black pt-2 font-semibold text-bmod-accent">02</span>
              <span class="border-t border-bmod-gray-200 pt-2">Delivery details</span>
            </li>
            <li class="grid grid-cols-[2rem_1fr] items-start gap-3">
              <span class="border-t border-bmod-black pt-2 font-semibold">03</span>
              <span class="border-t border-bmod-gray-200 pt-2">WhatsApp handoff</span>
            </li>
          </ol>
        </aside>

        <main class="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <div class="mb-8 border-b border-bmod-gray-200 pb-6">
            <p class="mb-2 text-xs font-medium uppercase tracking-widest text-bmod-accent">Manual confirmation</p>
            <h1 class="text-3xl font-bold tracking-normal md:text-5xl">Review your WhatsApp order</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-bmod-gray-700">
              We create a pending order reference before opening WhatsApp, so the store can track your cart without guesswork.
            </p>
          </div>

          @if (cart && cart.items.length > 0) {
            <div class="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_22rem]">
              <section>
                <div class="mb-6 border-y border-bmod-gray-200">
                  @for (item of cart.items; track item.id; let i = $index) {
                    <div class="grid grid-cols-[2rem_4rem_1fr_auto] items-center gap-4 border-b border-bmod-gray-200 py-4 last:border-b-0 sm:grid-cols-[3rem_5rem_1fr_auto]">
                      <span class="text-xs font-semibold tabular-nums text-bmod-gray-400">{{ (i + 1).toString().padStart(2, '0') }}</span>
                      <img [src]="item.product.images[0]?.url || 'assets/placeholder.webp'" [alt]="item.product.name" class="h-20 w-16 object-cover sm:h-24 sm:w-20" />
                      <div>
                        <p class="text-sm font-semibold">{{ item.product.name }}</p>
                        <div class="mt-1 flex flex-wrap gap-x-2 text-xs text-bmod-gray-400">
                          @if (item.size) { <span>Size {{ item.size }}</span> }
                          <span>Qty {{ item.quantity }}</span>
                        </div>
                      </div>
                      <p class="text-right text-sm font-semibold">{{ item.line_total_ngn | currencyDisplay }}</p>
                    </div>
                  }
                </div>

                <form [formGroup]="checkoutForm" class="grid grid-cols-1 gap-4 border-b border-bmod-gray-200 pb-6 sm:grid-cols-2">
                  <div>
                    <label class="mb-2 block text-xs font-medium uppercase tracking-widest">Full name</label>
                    <input formControlName="customer_name" class="input-field" autocomplete="name" />
                  </div>
                  <div>
                    <label class="mb-2 block text-xs font-medium uppercase tracking-widest">WhatsApp phone</label>
                    <input formControlName="phone" class="input-field" autocomplete="tel" placeholder="+2348012345678" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="mb-2 block text-xs font-medium uppercase tracking-widest">Delivery address</label>
                    <textarea formControlName="delivery_address" class="input-field min-h-28 resize-y" autocomplete="street-address"></textarea>
                  </div>
                  <div>
                    <label class="mb-2 block text-xs font-medium uppercase tracking-widest">Payment preference</label>
                    <select formControlName="payment_method" class="input-field">
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="POS">POS</option>
                    </select>
                  </div>
                  <label class="flex items-start gap-3 border border-bmod-gray-200 p-3 text-sm leading-5 text-bmod-gray-700 sm:self-end">
                    <input type="checkbox" formControlName="whatsapp_opt_in" class="mt-1 accent-bmod-accent" />
                    <span>I agree to be contacted on WhatsApp about this order.</span>
                  </label>
                </form>

                @if (error) {
                  <div class="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</div>
                }
              </section>

              <aside class="self-start border border-bmod-black p-5">
                <div class="mb-5 flex items-start justify-between border-b border-bmod-gray-200 pb-4">
                  <div>
                    <p class="text-xs uppercase tracking-widest text-bmod-gray-400">Total</p>
                    <p class="mt-1 text-2xl font-bold">{{ cart.total_ngn | currencyDisplay }}</p>
                  </div>
                  <span class="text-xs font-semibold tabular-nums text-bmod-accent">02/03</span>
                </div>
                <div class="mb-5 space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span>Items</span>
                    <span>{{ cart.item_count }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Handoff</span>
                    <span>WhatsApp</span>
                  </div>
                </div>
                <div class="flex flex-col gap-3">
                  <button (click)="checkout()" [disabled]="loading" class="btn-primary w-full">
                    {{ loading ? 'Preparing...' : 'Prepare Order' }}
                  </button>
                  <a routerLink="/cart" class="btn-outline w-full text-center">Back to Cart</a>
                </div>
              </aside>
            </div>

            @if (handoff) {
              <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 sm:items-center">
                <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-5">
                  <div class="mb-4 flex items-start justify-between gap-4 border-b border-bmod-gray-200 pb-4">
                    <div>
                      <p class="mb-1 text-xs font-medium uppercase tracking-widest text-bmod-gray-400">Order ready</p>
                      <h2 class="text-2xl font-bold">{{ handoff.order_ref }}</h2>
                    </div>
                    <button type="button" (click)="handoff = null" class="text-sm underline">Close</button>
                  </div>
                  <pre class="mb-4 whitespace-pre-wrap bg-bmod-gray-100 p-4 text-xs leading-relaxed">{{ handoff.order_summary }}</pre>
                  @if (copyMessage) {
                    <p class="mb-3 text-sm text-green-700">{{ copyMessage }}</p>
                  }
                  <div class="flex flex-col gap-3 sm:flex-row">
                    <a [href]="handoff.url" target="_blank" rel="noopener" class="btn-primary flex-1 text-center">Open WhatsApp</a>
                    <button type="button" (click)="copySummary()" class="btn-outline flex-1">Copy Summary</button>
                  </div>
                </div>
              </div>
            }
          } @else {
            <div class="border-y border-bmod-gray-200 py-16 text-center">
              <p class="mb-6 text-bmod-gray-400">No items in cart</p>
              <a routerLink="/shop" class="btn-primary inline-block">Shop Now</a>
            </div>
          }
        </main>
      </div>
    </div>
  `,
})
export class OrderReviewComponent implements OnInit {
  private cartService = inject(CartService);
  private store = inject(Store);
  private fb = inject(FormBuilder);

  cart: Cart | null = null;
  loading = false;
  error = '';
  handoff: CheckoutResponse | null = null;
  copyMessage = '';

  checkoutForm = this.fb.nonNullable.group({
    customer_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{7,14}$/)]],
    delivery_address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    payment_method: ['Bank Transfer' as 'Bank Transfer' | 'Cash' | 'POS', [Validators.required]],
    whatsapp_opt_in: [true, [Validators.requiredTrue]],
  });

  ngOnInit() {
    this.store.dispatch(loadCart());
    this.store.select(selectCart).subscribe(c => this.cart = c);
  }

  checkout() {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.error = 'Please add your delivery details and WhatsApp consent before continuing.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.cartService.checkout(this.checkoutForm.getRawValue()).subscribe({
      next: res => {
        this.loading = false;
        this.handoff = res;
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.detail ?? 'Could not prepare your WhatsApp order. Please try again.';
      },
    });
  }

  async copySummary() {
    if (!this.handoff) return;
    await navigator.clipboard.writeText(this.handoff.order_summary);
    this.copyMessage = 'Order summary copied.';
    setTimeout(() => this.copyMessage = '', 3000);
  }
}
