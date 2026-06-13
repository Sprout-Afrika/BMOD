import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="border-t border-bmod-gray-200 bg-bmod-white">
      @if (footerImages.length) {
        <section class="relative h-64 overflow-hidden border-b border-bmod-gray-200 bg-bmod-black md:h-80 lg:h-96">
          @for (image of footerImages; track image; let i = $index) {
            <img
              [src]="image"
              [alt]="'BMOD footer banner ' + (i + 1)"
              class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
              [class.opacity-100]="i === activeFooterIndex"
              [class.opacity-0]="i !== activeFooterIndex"
              [attr.aria-hidden]="i !== activeFooterIndex"
              loading="lazy"
            />
          }
          <div class="absolute inset-0 bg-black/15"></div>

          @if (footerImages.length > 1) {
            <div class="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2" aria-label="Footer banner slides">
              @for (image of footerImages; track image; let i = $index) {
                <button
                  type="button"
                  class="h-1 w-10 bg-white/45 transition-colors hover:bg-white"
                  [class.bg-white]="i === activeFooterIndex"
                  [attr.aria-label]="'Show footer banner ' + (i + 1)"
                  [attr.aria-current]="i === activeFooterIndex ? 'true' : null"
                  (click)="showFooterImage(i)"
                ></button>
              }
            </div>
          }
        </section>
      }

      <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-end md:justify-between">
        <div>
          <a routerLink="/" class="font-display text-2xl font-bold tracking-wider text-bmod-black">BMOD</a>
          <p class="mt-2 max-w-sm text-sm leading-6 text-bmod-gray-400">
            Curated fashion, bags, and accessories with direct WhatsApp checkout.
          </p>
        </div>
        <div class="flex flex-wrap gap-5 text-xs uppercase tracking-widest text-bmod-gray-400">
          <a routerLink="/shop" class="hover:text-bmod-black">Shop</a>
          <a routerLink="/wishlist" class="hover:text-bmod-black">Wishlist</a>
          <a routerLink="/cart" class="hover:text-bmod-black">Cart</a>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private carouselTimer?: ReturnType<typeof setInterval>;

  footerImages: string[] = [];
  activeFooterIndex = 0;

  ngOnInit() {
    this.api.getPublicSettings().subscribe({
      next: res => {
        const settings = Object.fromEntries(res.settings.map(setting => [setting.key, setting.value]));
        this.footerImages = [1, 2, 3]
          .map(position => settings[`footer_image_${position}_url`])
          .filter(Boolean);
        this.startCarousel();
      },
    });
  }

  ngOnDestroy() {
    this.stopCarousel();
  }

  showFooterImage(index: number) {
    this.activeFooterIndex = index;
    this.startCarousel();
  }

  private startCarousel() {
    this.stopCarousel();
    if (this.footerImages.length < 2) return;

    this.carouselTimer = setInterval(() => {
      this.activeFooterIndex = (this.activeFooterIndex + 1) % this.footerImages.length;
    }, 5000);
  }

  private stopCarousel() {
    if (this.carouselTimer) clearInterval(this.carouselTimer);
  }
}
