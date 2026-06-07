import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuditLogEntry } from '../../../core/models';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-10">
      <div class="flex items-center gap-4 mb-8">
        <a routerLink="/cms" class="text-bmod-gray-400 hover:text-bmod-black">← CMS</a>
        <h1 class="font-display text-2xl font-bold">Audit Log</h1>
      </div>

      @if (loading) {
        <div class="space-y-2">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="h-10 bg-bmod-gray-100 animate-pulse"></div>
          }
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-bmod-gray-200 text-xs tracking-widest uppercase text-bmod-gray-400">
                <th class="text-left py-3 pr-4">Time</th>
                <th class="text-left py-3 pr-4">Action</th>
                <th class="text-left py-3 pr-4">Target</th>
                <th class="text-left py-3">Actor ID</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-bmod-gray-200">
              @for (entry of entries; track entry.id) {
                <tr class="hover:bg-bmod-gray-100">
                  <td class="py-2 pr-4 text-bmod-gray-400 text-xs whitespace-nowrap">
                    {{ entry.created_at | date: 'dd MMM yyyy, HH:mm' }}
                  </td>
                  <td class="py-2 pr-4">
                    <code class="text-xs bg-bmod-gray-100 px-1.5 py-0.5">{{ entry.action }}</code>
                  </td>
                  <td class="py-2 pr-4 text-xs text-bmod-gray-400">
                    {{ entry.target_type }}
                    @if (entry.target_id) {
                      <span class="text-bmod-gray-200 mx-1">·</span>
                      <span class="font-mono">{{ entry.target_id | slice: 0:8 }}...</span>
                    }
                  </td>
                  <td class="py-2 text-xs font-mono text-bmod-gray-400">
                    {{ entry.actor_id | slice: 0:8 }}...
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages > 1) {
          <div class="flex gap-2 mt-6 justify-center">
            <button (click)="prevPage()" [disabled]="currentPage === 1" class="btn-outline text-xs py-1 px-3">Prev</button>
            <span class="py-1 px-3 text-sm text-bmod-gray-400">{{ currentPage }} / {{ totalPages }}</span>
            <button (click)="nextPage()" [disabled]="currentPage === totalPages" class="btn-outline text-xs py-1 px-3">Next</button>
          </div>
        }
      }
    </div>
  `,
})
export class AuditLogComponent implements OnInit {
  private api = inject(ApiService);

  entries: AuditLogEntry[] = [];
  loading = true;
  currentPage = 1;
  pageSize = 50;
  total = 0;

  get totalPages() { return Math.ceil(this.total / this.pageSize); }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getAuditLog(this.currentPage, this.pageSize).subscribe({
      next: res => { this.entries = res.items; this.total = res.total; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.load(); } }
  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.load(); } }
}
