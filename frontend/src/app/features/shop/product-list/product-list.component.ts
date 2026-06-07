import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Product } from '../../../core/models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ProductCardComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-10">
      <div class="flex flex-col md:flex-row gap-8">
        <!-- Filters Sidebar -->
        <aside class="md:w-56 flex-shrink-0">
          <h2 class="font-display text-xl font-bold mb-6">Filter</h2>

          <div class="mb-6">
            <label class="block text-xs tracking-widest uppercase mb-3">Category</label>
            <div class="flex flex-col gap-2">
              @for (cat of categories; track cat.value) {
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" [value]="cat.value" [formControl]="filters.controls['category']" name="category" class="accent-bmod-black" />
                  {{ cat.label }}
                </label>
              }
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" value="" [formControl]="filters.controls['category']" name="category" class="accent-bmod-black" />
                All
              </label>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-xs tracking-widest uppercase mb-3">Gender</label>
            <div class="flex flex-col gap-2">
              @for (g of genders; track g.value) {
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" [value]="g.value" [formControl]="filters.controls['gender']" name="gender" class="accent-bmod-black" />
                  {{ g.label }}
                </label>
              }
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" value="" [formControl]="filters.controls['gender']" name="gender" class="accent-bmod-black" />
                All
              </label>
            </div>
          </div>

          <div class="mb-6">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" [formControl]="filters.controls['in_stock']" class="accent-bmod-black" />
              In stock only
            </label>
          </div>

          <button (click)="clearFilters()" class="text-xs text-bmod-gray-400 underline hover:text-bmod-black">Clear filters</button>
        </aside>

        <!-- Products Grid -->
        <div class="flex-1">
          <!-- Search -->
          <div class="mb-6">
            <input [formControl]="searchControl" type="text" class="input-field" placeholder="Search products..." />
          </div>

          <div class="flex items-center justify-between mb-4">
            <p class="text-sm text-bmod-gray-400">{{ total }} products</p>
          </div>

          @if (loading) {
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="bg-bmod-gray-100 aspect-[3/4] animate-pulse"></div>
              }
            </div>
          } @else if (products.length === 0) {
            <div class="text-center py-20 text-bmod-gray-400">
              <p class="text-lg mb-2">No products found</p>
              <button (click)="clearFilters()" class="text-sm underline hover:text-bmod-black">Clear filters</button>
            </div>
          } @else {
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              @for (product of products; track product.id) {
                <app-product-card [product]="product" />
              }
            </div>
            <!-- Pagination -->
            @if (totalPages > 1) {
              <div class="flex justify-center gap-2 mt-10">
                @for (p of pages; track p) {
                  <button
                    (click)="goToPage(p)"
                    [class.bg-bmod-black]="p === currentPage"
                    [class.text-white]="p === currentPage"
                    class="w-9 h-9 text-sm border border-bmod-gray-200 hover:bg-bmod-black hover:text-white transition-colors">
                    {{ p }}
                  </button>
                }
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class ProductListComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  products: Product[] = [];
  total = 0;
  currentPage = 1;
  pageSize = 12;
  loading = true;

  filters = this.fb.group({
    category: [''],
    gender: [''],
    in_stock: [false],
  });

  searchControl = this.fb.control('');

  categories = [
    { label: 'Clothes', value: 'clothes' },
    { label: 'Bags', value: 'bags' },
    { label: 'Accessories', value: 'accessories' },
  ];

  genders = [
    { label: 'Men', value: 'men' },
    { label: 'Women', value: 'women' },
    { label: 'Unisex', value: 'unisex' },
  ];

  get totalPages() { return Math.ceil(this.total / this.pageSize); }
  get pages() { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  ngOnInit() {
    // Pre-fill category from query params
    this.route.queryParams.subscribe(p => {
      if (p['category']) this.filters.patchValue({ category: p['category'] });
    });

    this.filters.valueChanges.subscribe(() => { this.currentPage = 1; this.loadProducts(); });
    this.searchControl.valueChanges.pipe(debounceTime(400), distinctUntilChanged()).subscribe(q => {
      this.currentPage = 1;
      if (q && q.length >= 3) {
        this.searchProducts(q);
      } else if (!q) {
        this.loadProducts();
      }
    });
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    const { category, gender, in_stock } = this.filters.value;
    const params: Record<string, string | number | boolean | undefined> = {
      page: this.currentPage, page_size: this.pageSize,
      category: category || undefined,
      gender: gender || undefined,
      in_stock: in_stock ? true : undefined,
    };
    this.api.getProducts(params).subscribe({
      next: res => { this.products = res.items; this.total = res.total; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  searchProducts(q: string) {
    this.loading = true;
    this.api.searchProducts(q, this.currentPage).subscribe({
      next: res => { this.products = res.items; this.total = res.total; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  clearFilters() {
    this.filters.reset({ category: '', gender: '', in_stock: false });
    this.searchControl.reset('');
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
