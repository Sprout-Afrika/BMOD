import { Routes } from '@angular/router';
import { authGuard, publicGuard, staffGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'shop',
    loadComponent: () => import('./features/shop/product-list/product-list.component').then(m => m.ProductListComponent),
  },
  {
    path: 'shop/:id',
    loadComponent: () => import('./features/shop/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
  },
  {
    path: 'auth/login',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'auth/register',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'auth/verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
  },
  {
    path: 'auth/forgot-password',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'cart',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cart/cart.component').then(m => m.CartComponent),
  },
  {
    path: 'cart/review',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cart/order-review/order-review.component').then(m => m.OrderReviewComponent),
  },
  {
    path: 'wishlist',
    canActivate: [authGuard],
    loadComponent: () => import('./features/wishlist/wishlist.component').then(m => m.WishlistComponent),
  },
  {
    path: 'cms',
    canActivate: [staffGuard],
    loadComponent: () => import('./features/cms/dashboard/cms-dashboard.component').then(m => m.CmsDashboardComponent),
  },
  {
    path: 'cms/products',
    canActivate: [staffGuard],
    loadComponent: () => import('./features/cms/product-list/cms-product-list.component').then(m => m.CmsProductListComponent),
  },
  {
    path: 'cms/products/new',
    canActivate: [staffGuard],
    loadComponent: () => import('./features/cms/product-form/cms-product-form.component').then(m => m.CmsProductFormComponent),
  },
  {
    path: 'cms/products/:id/edit',
    canActivate: [staffGuard],
    loadComponent: () => import('./features/cms/product-form/cms-product-form.component').then(m => m.CmsProductFormComponent),
  },
  {
    path: 'cms/settings',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/cms/settings/cms-settings.component').then(m => m.CmsSettingsComponent),
  },
  {
    path: 'cms/audit-log',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/cms/audit-log/audit-log.component').then(m => m.AuditLogComponent),
  },
  { path: '**', redirectTo: '' },
];
