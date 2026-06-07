import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-cms-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-10">
      <div class="flex items-center gap-4 mb-8">
        <a routerLink="/cms" class="text-bmod-gray-400 hover:text-bmod-black">← CMS</a>
        <h1 class="font-display text-2xl font-bold">Settings</h1>
      </div>

      @if (message) {
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm mb-6">{{ message }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="save()" class="space-y-6">
        <div class="border border-bmod-gray-200 p-6">
          <h2 class="font-semibold mb-4">Exchange Rate</h2>
          <label class="block text-xs tracking-widest uppercase mb-2">NGN per 1 USD</label>
          <div class="flex gap-3">
            <input type="number" formControlName="exchange_rate" class="input-field" placeholder="e.g. 1600" min="1" />
            <button type="button" (click)="updateSetting('exchange_rate', form.value.exchange_rate?.toString() ?? '')" class="btn-primary whitespace-nowrap">
              Update
            </button>
          </div>
          <p class="text-xs text-bmod-gray-400 mt-2">Used to display USD prices and generate order totals</p>
        </div>

        <div class="border border-bmod-gray-200 p-6">
          <h2 class="font-semibold mb-4">WhatsApp Number</h2>
          <label class="block text-xs tracking-widest uppercase mb-2">Number (international format, no +)</label>
          <div class="flex gap-3">
            <input type="text" formControlName="whatsapp_number" class="input-field" placeholder="e.g. 2348012345678" />
            <button type="button" (click)="updateSetting('whatsapp_number', form.value.whatsapp_number ?? '')" class="btn-primary whitespace-nowrap">
              Update
            </button>
          </div>
          <p class="text-xs text-bmod-gray-400 mt-2">All checkout messages are sent to this number</p>
        </div>
      </form>
    </div>
  `,
})
export class CmsSettingsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    exchange_rate: ['', Validators.required],
    whatsapp_number: ['', Validators.required],
  });

  message = '';

  ngOnInit() {
    this.api.getSettings().subscribe(res => {
      const map: Record<string, string> = {};
      res.settings.forEach(s => map[s.key] = s.value);
      this.form.patchValue({
        exchange_rate: map['exchange_rate'] ?? '',
        whatsapp_number: map['whatsapp_number'] ?? '',
      });
    });
  }

  updateSetting(key: string, value: string) {
    if (!value) return;
    this.api.updateSetting(key, value).subscribe({
      next: () => { this.message = `${key.replace('_', ' ')} updated`; setTimeout(() => this.message = '', 3000); },
      error: err => { this.message = err.error?.detail ?? 'Update failed'; },
    });
  }

  save() {}
}
