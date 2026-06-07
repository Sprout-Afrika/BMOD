import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Product } from '../../../core/models';

@Component({
  selector: 'app-cms-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-10">
      <div class="flex items-center justify-between mb-8">
        <h1 class="font-display text-3xl font-bold">Products</h1>
        <a routerLink="/cms/products/new" class="btn-primary">+ New Product</a>
      </div>

      @if (loading) {
        <div class="space-y-2">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="h-12 bg-bmod-gray-100 animate-pulse"></div>
          }
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-bmod-gray-200 text-xs tracking-widest uppercase text-bmod-gray-400">
                <th class="text-left py-3 pr-4">Product</th>
                <th class="text-left py-3 pr-4">Category</th>
                <th class="text-left py-3 pr-4">Price (NGN)</th>
                <th class="text-left py-3 pr-4">Stock</th>
                <th class="text-left py-3 pr-4">Featured</th>
                <th class="text-right py-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-bmod-gray-200">
              @for (p of products; track p.id) {
                <tr class="hover:bg-bmod-gray-100">
                  <td class="py-3 pr-4">
                    <div class="flex items-center gap-3">
                      <img [src]="p.images[0]?.url || 'assets/placeholder.webp'" [alt]="p.name" class="w-10 h-12 object-cover" />
                      <span class="font-medium">{{ p.name }}</span>
                    </div>
                  </td>
                  <td class="py-3 pr-4 capitalize">{{ p.category }}</td>
                  <td class="py-3 pr-4">₦{{ p.price_ngn.toLocaleString() }}</td>
                  <td class="py-3 pr-4">
                    <button (click)="toggleStock(p)" [class]="p.is_in_stock ? 'badge bg-green-100 text-green-800' : 'badge bg-red-100 text-red-800'">
                      {{ p.is_in_stock ? 'In Stock' : 'Out' }}
                    </button>
                  </td>
                  <td class="py-3 pr-4">
                    <span [class]="p.is_featured ? 'badge bg-bmod-accent text-bmod-black' : 'badge bg-bmod-gray-100 text-bmod-gray-400'">
                      {{ p.is_featured ? 'Yes' : 'No' }}
                    </span>
                  </td>
                  <td class="py-3 text-right">
                    <a [routerLink]="['/cms/products', p.id, 'edit']" class="text-xs underline hover:text-bmod-accent mr-3">Edit</a>
                    <button (click)="confirmDelete(p)" class="text-xs text-red-500 underline hover:text-red-700">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (products.length === 0) {
          <div class="text-center py-16 text-bmod-gray-400">
            No products yet. <a routerLink="/cms/products/new" class="underline text-bmod-black">Add your first product.</a>
          </div>
        }
      }
    </div>
  `,
})
export class CmsProductListComponent implements OnInit {
  private api = inject(ApiService);

  products: Product[] = [];
  loading = true;

  ngOnInit() {
    this.api.getProducts({ page_size: 200 }).subscribe({
      next: res => { this.products = res.items; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  toggleStock(product: Product) {
    this.api.updateProduct(product.id, { is_in_stock: !product.is_in_stock }).subscribe(updated => {
      product.is_in_stock = updated.is_in_stock;
    });
  }

  confirmDelete(product: Product) {
    if (confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      this.api.deleteProduct(product.id).subscribe(() => {
        this.products = this.products.filter(p => p.id !== product.id);
      });
    }
  }
}
