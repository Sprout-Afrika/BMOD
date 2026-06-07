import { Pipe, PipeTransform, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { selectCurrency } from '../../core/store/auth/auth.selectors';

@Pipe({ name: 'currencyDisplay', standalone: true, pure: false })
export class CurrencyDisplayPipe implements PipeTransform {
  private store = inject(Store);
  private currency = 'NGN';
  private exchangeRate = 1600;

  constructor() {
    this.store.select(selectCurrency).subscribe(c => this.currency = c);
  }

  transform(priceNgn: number, exchangeRate?: number): string {
    const rate = exchangeRate ?? this.exchangeRate;
    if (this.currency === 'USD') {
      const usd = priceNgn / rate;
      return `$${usd.toFixed(2)}`;
    }
    return `₦${priceNgn.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
}
