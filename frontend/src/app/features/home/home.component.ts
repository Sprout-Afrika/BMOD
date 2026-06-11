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
    <section class="relative bg-bmod-black text-white min-h-[70vh] overflow-hidden bg-cover bg-center md:min-h-[70vh]" [style.background-image]="mobileHeroBackgroundImage">
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
      <div class="absolute inset-0 z-10 bg-gradient-to-b from-black/8 via-black/12 to-black/24"></div>

      <div class="relative z-20 flex min-h-[70vh] items-center justify-center px-4 text-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
        <div class="max-w-xl">
          <p class="mb-4 text-xs uppercase tracking-[0.45em] text-bmod-accent">New Collection</p>
          <h1 class="font-display text-5xl font-bold leading-tight md:text-7xl">
            Define Your<br />Style.
          </h1>
          <p class="mx-auto mt-5 max-w-md text-base leading-6 text-white/78 md:text-lg">
            Curated fashion for the bold. Clothes, bags, and accessories.
          </p>
          <a routerLink="/shop" class="btn-primary mt-8 inline-block border border-white hover:border-bmod-accent">
            Shop Now
          </a>
        </div>
      </div>

      @if (heroImages.length > 1) {
        <div class="absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 md:flex">
          <button
            type="button"
            (click)="previousHero()"
            class="flex h-8 w-12 items-center justify-center border border-white/60 bg-black/20 text-[10px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-bmod-black"
            aria-label="Previous banner">
            Prev
          </button>
          @for (url of heroImages; track url; let i = $index) {
            <button
              type="button"
              (click)="activeHeroIndex = i"
              class="h-8 min-w-8 border border-white/30 px-2 text-[10px] font-semibold tabular-nums text-white/70 transition-colors hover:border-white hover:text-white"
              [class.bg-white]="i === activeHeroIndex"
              [class.text-bmod-black]="i === activeHeroIndex"
              [attr.aria-label]="'Show banner ' + (i + 1)">
              {{ (i + 1).toString().padStart(2, '0') }}
            </button>
          }
          <button
            type="button"
            (click)="nextHero()"
            class="flex h-8 w-12 items-center justify-center border border-white/60 bg-black/20 text-[10px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-bmod-black"
            aria-label="Next banner">
            Next
          </button>
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

  nextHero() {
    if (this.heroImages.length <= 1) return;
    this.activeHeroIndex = (this.activeHeroIndex + 1) % this.heroImages.length;
    this.startHeroCarousel(false);
  }

  previousHero() {
    if (this.heroImages.length <= 1) return;
    this.activeHeroIndex = (this.activeHeroIndex - 1 + this.heroImages.length) % this.heroImages.length;
    this.startHeroCarousel(false);
  }

  private startHeroCarousel(resetIndex = true) {
    if (this.heroTimer) clearInterval(this.heroTimer);
    if (resetIndex) this.activeHeroIndex = 0;
    if (this.heroImages.length <= 1) return;
    this.heroTimer = setInterval(() => {
      this.activeHeroIndex = (this.activeHeroIndex + 1) % this.heroImages.length;
    }, 5000);
  }
}
