import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Product } from '../../core/models';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  template: `
    <!-- Hero -->
    <section class="relative bg-bmod-black text-white min-h-[70vh] flex items-center justify-center overflow-hidden bg-cover bg-center" [style.background-image]="mobileHeroBackgroundImage">
      <div class="absolute inset-0 hidden md:block">
        @for (url of heroImages; track url; let i = $index) {
          <img
            [src]="url"
            alt=""
            class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            [class.opacity-100]="i === activeHeroIndex"
            [class.opacity-0]="i !== activeHeroIndex"
          />
        }
      </div>
      <div class="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/30 z-10"></div>
      <div class="relative z-20 text-center px-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
        <p class="text-bmod-accent text-xs tracking-[0.4em] uppercase mb-4">New Collection</p>
        <h1 class="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Define Your<br />Style.
        </h1>
        <p class="text-white/70 text-lg mb-8 max-w-md mx-auto">
          Curated fashion for the bold. Clothes, bags, and accessories.
        </p>
        <a routerLink="/shop" class="btn-primary inline-block border border-white hover:border-bmod-accent">
          Shop Now
        </a>
      </div>
      @if (heroImages.length > 1) {
        <div class="absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 gap-2 md:flex">
          @for (url of heroImages; track url; let i = $index) {
            <button
              type="button"
              (click)="activeHeroIndex = i"
              class="h-1.5 w-8 bg-white/50 transition-colors"
              [class.bg-white]="i === activeHeroIndex"
              [attr.aria-label]="'Show banner ' + (i + 1)">
            </button>
          }
        </div>
      }
    </section>

    <!-- Featured Products -->
    <section class="py-16 px-4 max-w-7xl mx-auto">
      <div class="flex items-end justify-between mb-10">
        <div>
          <p class="text-bmod-gray-400 text-xs tracking-widest uppercase mb-1">Handpicked</p>
          <h2 class="font-display text-3xl font-bold">Featured Pieces</h2>
        </div>
        <a routerLink="/shop" class="text-sm tracking-widest uppercase hover:text-bmod-accent transition-colors border-b border-bmod-black pb-0.5">
          View All
        </a>
      </div>

      @if (loading) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-bmod-gray-100 aspect-[3/4] animate-pulse"></div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          @for (product of featuredProducts; track product.id) {
            <app-product-card [product]="product" />
          }
        </div>
      }
    </section>

    <!-- Categories -->
    <section class="py-16 bg-bmod-gray-100">
      <div class="max-w-7xl mx-auto px-4">
        <h2 class="font-display text-3xl font-bold text-center mb-10">Shop by Category</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (cat of categories; track cat.label) {
            <a [routerLink]="['/shop']" [queryParams]="{ category: cat.value }"
               class="group relative h-64 bg-bmod-black overflow-hidden flex items-end p-6">
              <img [src]="getCategoryImage(cat.value)" [alt]="cat.label" class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
              <div class="relative z-20">
                <h3 class="font-display text-white text-2xl font-semibold">{{ cat.label }}</h3>
                <span class="text-white/60 text-xs tracking-widest uppercase group-hover:text-bmod-accent transition-colors">
                  Shop {{ cat.label }} →
                </span>
              </div>
            </a>
          }
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 bg-bmod-black text-white text-center px-4">
      <p class="text-bmod-accent text-xs tracking-[0.4em] uppercase mb-4">Order via WhatsApp</p>
      <h2 class="font-display text-4xl font-bold mb-4">Simple Checkout.<br />Direct Connection.</h2>
      <p class="text-white/60 max-w-md mx-auto mb-8">Add items to your cart, review your order, and complete your purchase on WhatsApp. No fuss.</p>
      <a routerLink="/shop" class="btn-primary border border-white hover:border-bmod-accent inline-block">
        Start Shopping
      </a>
    </section>
  `,
})
export class HomeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);

  featuredProducts: Product[] = [];
  loading = true;
  siteSettings: Record<string, string> = {};
  heroImages: string[] = [];
  activeHeroIndex = 0;
  private heroTimer: ReturnType<typeof setInterval> | null = null;

  categories = [
    { label: 'Clothes', value: 'clothes' },
    { label: 'Bags', value: 'bags' },
    { label: 'Accessories', value: 'accessories' },
  ];

  ngOnInit() {
    this.api.getProducts({ featured: true, page_size: 4, in_stock: true }).subscribe({
      next: res => { this.featuredProducts = res.items; this.loading = false; },
      error: () => this.loading = false,
    });
    this.api.getPublicSettings().subscribe({
      next: res => {
        this.siteSettings = Object.fromEntries(res.settings.map(setting => [setting.key, setting.value]));
        this.heroImages = this.resolveHeroImages();
        this.startHeroCarousel();
      },
    });
  }

  ngOnDestroy() {
    if (this.heroTimer) clearInterval(this.heroTimer);
  }

  get mobileHeroBackgroundImage(): string {
    const url = this.siteSettings['hero_banner_url'] || this.heroImages[0];
    return url ? `url("${url}")` : 'none';
  }

  getCategoryImage(category: string): string {
    return this.siteSettings[`category_${category}_image_url`] || 'assets/placeholder.webp';
  }

  private resolveHeroImages(): string[] {
    const carousel = [1, 2, 3]
      .map(position => this.siteSettings[`hero_carousel_image_${position}_url`])
      .filter(Boolean);
    return carousel.length ? carousel : [this.siteSettings['hero_banner_url']].filter(Boolean);
  }

  private startHeroCarousel() {
    if (this.heroTimer) clearInterval(this.heroTimer);
    this.activeHeroIndex = 0;
    if (this.heroImages.length <= 1) return;
    this.heroTimer = setInterval(() => {
      this.activeHeroIndex = (this.activeHeroIndex + 1) % this.heroImages.length;
    }, 5000);
  }
}
