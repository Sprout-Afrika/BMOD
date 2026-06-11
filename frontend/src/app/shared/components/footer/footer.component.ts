import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="border-t border-bmod-gray-200 bg-bmod-white">
      @if (footerImages.length) {
        <div class="grid grid-cols-3 border-b border-bmod-gray-200">
          @for (image of footerImages; track image; let i = $index) {
            <div class="product-image-frame aspect-[4/3] border-r border-bmod-gray-200 last:border-r-0">
              <img [src]="image" [alt]="'BMOD footer image ' + (i + 1)" class="product-image" loading="lazy" />
            </div>
          }
        </div>
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
export class FooterComponent implements OnInit {
  private api = inject(ApiService);

  footerImages: string[] = [];

  ngOnInit() {
    this.api.getPublicSettings().subscribe({
      next: res => {
        const settings = Object.fromEntries(res.settings.map(setting => [setting.key, setting.value]));
        this.footerImages = [1, 2, 3]
          .map(position => settings[`footer_image_${position}_url`])
          .filter(Boolean);
      },
    });
  }
}
