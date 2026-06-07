import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-cms-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-10">
      <h1 class="font-display text-3xl font-bold mb-8">CMS Dashboard</h1>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a routerLink="/cms/products" class="border border-bmod-gray-200 p-6 hover:border-bmod-black transition-colors group">
          <div class="text-3xl mb-3">👗</div>
          <h2 class="font-semibold text-lg mb-1">Products</h2>
          <p class="text-sm text-bmod-gray-400">Manage catalogue, add/edit products, upload images</p>
        </a>
        <a routerLink="/cms/settings" class="border border-bmod-gray-200 p-6 hover:border-bmod-black transition-colors group">
          <div class="text-3xl mb-3">⚙️</div>
          <h2 class="font-semibold text-lg mb-1">Settings</h2>
          <p class="text-sm text-bmod-gray-400">Exchange rate, WhatsApp number</p>
        </a>
        <a routerLink="/cms/audit-log" class="border border-bmod-gray-200 p-6 hover:border-bmod-black transition-colors group">
          <div class="text-3xl mb-3">📋</div>
          <h2 class="font-semibold text-lg mb-1">Audit Log</h2>
          <p class="text-sm text-bmod-gray-400">Review all staff and admin actions</p>
        </a>
      </div>
    </div>
  `,
})
export class CmsDashboardComponent {}
