import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { IntegrationStatus } from '../../../core/models';

@Component({
  selector: 'app-cms-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-10">
      <h1 class="font-display text-3xl font-bold mb-8">CMS Dashboard</h1>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <a routerLink="/cms/products" class="border border-bmod-gray-200 p-6 hover:border-bmod-black transition-colors">
          <p class="text-xs uppercase tracking-widest text-bmod-gray-400 mb-3">Catalog</p>
          <h2 class="font-semibold text-lg mb-1">Products</h2>
          <p class="text-sm text-bmod-gray-400">Manage catalogue, add/edit products, upload images</p>
        </a>

        <a routerLink="/cms/settings" class="border border-bmod-gray-200 p-6 hover:border-bmod-black transition-colors">
          <p class="text-xs uppercase tracking-widest text-bmod-gray-400 mb-3">Store</p>
          <h2 class="font-semibold text-lg mb-1">Settings</h2>
          <p class="text-sm text-bmod-gray-400">Exchange rate, WhatsApp number, homepage images</p>
        </a>

        <a routerLink="/cms/audit-log" class="border border-bmod-gray-200 p-6 hover:border-bmod-black transition-colors">
          <p class="text-xs uppercase tracking-widest text-bmod-gray-400 mb-3">Security</p>
          <h2 class="font-semibold text-lg mb-1">Audit Log</h2>
          <p class="text-sm text-bmod-gray-400">Review staff and admin actions</p>
        </a>
      </div>

      <section class="border border-bmod-gray-200 p-6">
        <div class="flex items-center justify-between gap-4 mb-4">
          <div>
            <p class="text-xs uppercase tracking-widest text-bmod-gray-400 mb-1">Production Checks</p>
            <h2 class="font-semibold text-lg">Backend Integrations</h2>
          </div>
          <button type="button" (click)="loadStatus()" class="btn-outline px-4 py-2 text-xs">
            Refresh
          </button>
        </div>

        @if (statusLoading) {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            @for (item of [1, 2, 3]; track item) {
              <div class="h-16 bg-bmod-gray-100 animate-pulse"></div>
            }
          </div>
        } @else if (status) {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            @for (entry of serviceEntries; track entry.name) {
              <div class="border border-bmod-gray-200 p-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium capitalize">{{ entry.name }}</span>
                  <span
                    class="badge"
                    [class.bg-green-100]="entry.data.status === 'ok'"
                    [class.text-green-800]="entry.data.status === 'ok'"
                    [class.bg-red-100]="entry.data.status === 'error'"
                    [class.text-red-800]="entry.data.status === 'error'"
                    [class.bg-bmod-gray-100]="entry.data.status === 'not_configured'"
                    [class.text-bmod-gray-400]="entry.data.status === 'not_configured'">
                    {{ entry.data.status }}
                  </span>
                </div>
                @if (entry.data.message) {
                  <p class="mt-2 text-xs text-bmod-gray-400">{{ entry.data.message }}</p>
                }
              </div>
            }
          </div>
        } @else {
          <p class="text-sm text-bmod-gray-400">Connection checks are available to admin users.</p>
        }
      </section>
    </div>
  `,
})
export class CmsDashboardComponent implements OnInit {
  private api = inject(ApiService);

  status: IntegrationStatus | null = null;
  statusLoading = false;

  get serviceEntries() {
    return Object.entries(this.status?.services ?? {}).map(([name, data]) => ({ name, data }));
  }

  ngOnInit() {
    this.loadStatus();
  }

  loadStatus() {
    this.statusLoading = true;
    this.api.getIntegrationStatus().subscribe({
      next: status => {
        this.status = status;
        this.statusLoading = false;
      },
      error: () => {
        this.status = null;
        this.statusLoading = false;
      },
    });
  }
}
