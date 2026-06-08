import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product, ProductListResponse, Cart, WishlistItem, AuditLogEntry } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // Products
  getProducts(params: Record<string, string | number | boolean | undefined> = {}): Observable<ProductListResponse> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<ProductListResponse>(`${this.base}/products`, { params: httpParams });
  }

  searchProducts(q: string, page = 1): Observable<ProductListResponse> {
    return this.http.get<ProductListResponse>(`${this.base}/products/search`, { params: { q, page } });
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/products/${id}`);
  }

  createProduct(data: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.base}/products`, data);
  }

  updateProduct(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.base}/products/${id}`, data);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/products/${id}`);
  }

  uploadProductImage(productId: string, position: number, file: File, altText?: string): Observable<{ url: string; position: number }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string; position: number }>(
      `${this.base}/products/${productId}/images?position=${position}${altText ? '&alt_text=' + altText : ''}`,
      form
    );
  }

  deleteProductImage(productId: string, position: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/products/${productId}/images/${position}`);
  }

  setOutfitTags(productId: string, productIds: string[]): Observable<unknown> {
    return this.http.post(`${this.base}/products/${productId}/outfit-tags`, { product_ids: productIds });
  }

  // Settings
  getExchangeRate(): Observable<{ exchange_rate: string }> {
    return this.http.get<{ exchange_rate: string }>(`${this.base}/settings/exchange-rate`);
  }

  getSettings(): Observable<{ settings: { key: string; value: string }[] }> {
    return this.http.get<{ settings: { key: string; value: string }[] }>(`${this.base}/settings`);
  }

  getPublicSettings(): Observable<{ settings: { key: string; value: string }[] }> {
    return this.http.get<{ settings: { key: string; value: string }[] }>(`${this.base}/settings/public`);
  }

  updateSetting(key: string, value: string): Observable<{ key: string; value: string }> {
    return this.http.patch<{ key: string; value: string }>(`${this.base}/settings/${key}`, { value });
  }

  uploadSettingImage(key: string, file: File): Observable<{ key: string; value: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ key: string; value: string }>(`${this.base}/settings/images?key=${key}`, form);
  }

  // CMS
  getAuditLog(page = 1, pageSize = 50): Observable<{ items: AuditLogEntry[]; total: number; page: number; page_size: number }> {
    return this.http.get<{ items: AuditLogEntry[]; total: number; page: number; page_size: number }>(
      `${this.base}/cms/audit-log`, { params: { page, page_size: pageSize } }
    );
  }

  getStaff(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/cms/staff`);
  }

  createStaff(email: string, password: string): Observable<unknown> {
    return this.http.post(`${this.base}/cms/staff`, { email, password });
  }

  revokeStaff(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/cms/staff/${id}`);
  }
}
