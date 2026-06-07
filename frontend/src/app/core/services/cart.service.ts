import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cart, CheckoutRequest, CheckoutResponse } from '../models';
import { loadCart } from '../store/cart/cart.actions';

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private store = inject(Store);
  private base = `${environment.apiUrl}/cart`;

  getCart(): Observable<Cart> {
    return this.http.get<Cart>(this.base);
  }

  addItem(product_id: string, size: string | null, quantity: number): Observable<unknown> {
    return this.http.post(`${this.base}/items`, { product_id, size, quantity }).pipe(
      tap(() => this.store.dispatch(loadCart()))
    );
  }

  updateItem(item_id: string, quantity: number): Observable<unknown> {
    return this.http.patch(`${this.base}/items/${item_id}`, { quantity }).pipe(
      tap(() => this.store.dispatch(loadCart()))
    );
  }

  removeItem(item_id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/items/${item_id}`).pipe(
      tap(() => this.store.dispatch(loadCart()))
    );
  }

  clearCart(): Observable<void> {
    return this.http.delete<void>(this.base).pipe(
      tap(() => this.store.dispatch(loadCart()))
    );
  }

  checkout(payload: CheckoutRequest): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.base}/checkout`, payload);
  }
}
