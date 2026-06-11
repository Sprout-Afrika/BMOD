import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { Product } from '../../../core/models';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-cms-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-3xl mx-auto px-4 py-10">
      <div class="flex items-center gap-4 mb-8">
        <a routerLink="/cms/products" class="text-bmod-gray-400 hover:text-bmod-black">Back to Products</a>
        <h1 class="font-display text-2xl font-bold">{{ isEdit ? 'Edit Product' : 'New Product' }}</h1>
      </div>

      @if (error) {
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-6">{{ error }}</div>
      }
      @if (success) {
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm mb-6">{{ success }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="md:col-span-2">
            <label class="block text-xs tracking-widest uppercase mb-2">Product Name *</label>
            <input type="text" formControlName="name" class="input-field" placeholder="e.g. Classic Linen Shirt" />
          </div>

          <div>
            <label class="block text-xs tracking-widest uppercase mb-2">Category *</label>
            <select formControlName="category" class="input-field">
              <option value="">Select category</option>
              <option value="clothes">Clothes</option>
              <option value="bags">Bags</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>

          <div>
            <label class="block text-xs tracking-widest uppercase mb-2">Gender Target *</label>
            <select formControlName="gender_target" class="input-field">
              <option value="">Select gender</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          <div>
            <label class="block text-xs tracking-widest uppercase mb-2">Price (NGN) *</label>
            <input type="number" formControlName="price_ngn" class="input-field" placeholder="e.g. 25000" min="1" step="50" />
          </div>

          <div>
            <label class="block text-xs tracking-widest uppercase mb-2">Sizes (comma-separated)</label>
            <input type="text" formControlName="sizes_raw" class="input-field" placeholder="S, M, L, XL" />
            <p class="text-xs text-bmod-gray-400 mt-1">Leave empty for bags/accessories</p>
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs tracking-widest uppercase mb-2">Description *</label>
            <textarea formControlName="description" class="input-field" rows="4" placeholder="Describe the product..."></textarea>
          </div>

          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" formControlName="is_in_stock" class="accent-bmod-black" />
              In Stock
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" formControlName="is_featured" class="accent-bmod-black" />
              Featured
            </label>
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-xs tracking-widest uppercase mb-3">Product Images (Positions 1, 2, 3)</label>
          <div class="grid grid-cols-3 gap-3">
            @for (pos of imagePositions; track pos) {
              <div class="product-image-frame border border-dashed border-bmod-gray-200 aspect-[3/4] flex items-center justify-center">
                @if (getPreviewAtPos(pos)) {
                  <img [src]="getPreviewAtPos(pos)" [alt]="(form.value.name || 'Product') + ' image ' + pos" class="product-image" />
                  <button type="button" (click)="removeImage(pos)" class="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5">Remove</button>
                } @else {
                  <label class="cursor-pointer text-center p-4">
                    <span class="text-bmod-gray-400 text-xs block mb-1">Position {{ pos }}</span>
                    <span class="text-xs underline">Upload</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" (change)="selectImage($event, pos)" />
                  </label>
                }
              </div>
            }
          </div>
          @if (!isEdit) {
            <p class="text-xs text-bmod-gray-400 mt-2">Images are uploaded after the product record is created.</p>
          }
        </div>

        <div class="flex gap-3">
          <button type="submit" class="btn-primary" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Product') }}
          </button>
          <a routerLink="/cms/products" class="btn-outline">Cancel</a>
        </div>
      </form>
    </div>
  `,
})
export class CmsProductFormComponent implements OnInit, OnDestroy {
  @Input() id?: string;

  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);

  product: Product | null = null;
  saving = false;
  error = '';
  success = '';
  imagePositions = [1, 2, 3];
  selectedImages: Record<number, File | undefined> = {};
  selectedPreviews: Record<number, string | undefined> = {};

  get isEdit() { return !!this.id; }

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', Validators.required],
    category: ['', Validators.required],
    gender_target: ['', Validators.required],
    price_ngn: [null as number | null, [Validators.required, Validators.min(1)]],
    sizes_raw: [''],
    is_in_stock: [true],
    is_featured: [false],
  });

  ngOnInit() {
    if (this.id) {
      this.api.getProduct(this.id).subscribe({
        next: p => {
          this.product = p;
          this.form.patchValue({
            name: p.name,
            description: p.description ?? '',
            category: p.category,
            gender_target: p.gender_target,
            price_ngn: p.price_ngn,
            sizes_raw: p.sizes?.join(', ') ?? '',
            is_in_stock: p.is_in_stock,
            is_featured: p.is_featured,
          });
        },
        error: () => this.router.navigate(['/cms/products']),
      });
    }
  }

  ngOnDestroy() {
    this.imagePositions.forEach(position => this.revokePreview(position));
  }

  getImageAtPos(pos: number): string | null {
    return this.product?.images.find(i => i.position === pos)?.url ?? null;
  }

  getPreviewAtPos(pos: number): string | null {
    return this.selectedPreviews[pos] ?? this.getImageAtPos(pos);
  }

  selectImage(event: Event, position: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.error = '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error = 'Only JPG, PNG, and WebP images are accepted.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.error = 'Image must be 5 MB or smaller.';
      return;
    }

    if (!this.id) {
      this.revokePreview(position);
      this.selectedImages[position] = file;
      this.selectedPreviews[position] = URL.createObjectURL(file);
      return;
    }

    this.api.uploadProductImage(this.id, position, file).subscribe({
      next: () => { this.success = `Image ${position} uploaded`; this.reloadProduct(); },
      error: err => this.error = err.error?.detail ?? 'Upload failed',
    });
  }

  removeImage(position: number) {
    if (this.selectedImages[position]) {
      this.revokePreview(position);
      delete this.selectedImages[position];
      return;
    }
    this.deleteImage(position);
  }

  deleteImage(position: number) {
    if (!this.id) return;
    this.api.deleteProductImage(this.id, position).subscribe({
      next: () => { this.success = `Image ${position} removed`; this.reloadProduct(); },
      error: err => this.error = err.error?.detail ?? 'Delete failed',
    });
  }

  reloadProduct() {
    if (this.id) this.api.getProduct(this.id).subscribe(p => this.product = p);
  }

  revokePreview(position: number) {
    const preview = this.selectedPreviews[position];
    if (preview) URL.revokeObjectURL(preview);
    delete this.selectedPreviews[position];
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';

    const { name, description, category, gender_target, price_ngn, sizes_raw, is_in_stock, is_featured } = this.form.value;
    const sizes = sizes_raw ? sizes_raw.split(',').map(s => s.trim()).filter(Boolean) : null;
    const payload: Partial<Product> = {
      name: name!,
      description: description!,
      category: category! as Product['category'],
      gender_target: gender_target! as Product['gender_target'],
      price_ngn: price_ngn!,
      sizes,
      is_in_stock: is_in_stock!,
      is_featured: is_featured!,
    };

    const req = this.id
      ? this.api.updateProduct(this.id, payload)
      : this.api.createProduct(payload).pipe(
          switchMap(product => {
            const uploads = this.imagePositions
              .map(position => {
                const file = this.selectedImages[position];
                return file ? this.api.uploadProductImage(product.id, position, file) : null;
              })
              .filter(Boolean);

            return uploads.length ? forkJoin(uploads).pipe(switchMap(() => of(product))) : of(product);
          })
        );

    req.subscribe({
      next: product => {
        this.saving = false;
        this.success = this.id ? 'Product updated!' : 'Product created!';
        if (!this.id) this.router.navigate(['/cms/products', product.id, 'edit']);
      },
      error: err => {
        this.saving = false;
        this.error = err.error?.detail ?? 'Save failed';
      },
    });
  }
}
