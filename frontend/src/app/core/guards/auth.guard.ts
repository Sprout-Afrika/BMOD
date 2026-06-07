import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectIsLoggedIn, selectRole } from '../store/auth/auth.selectors';

export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectIsLoggedIn).pipe(
    take(1),
    map(isLoggedIn => isLoggedIn || router.createUrlTree(['/auth/login']))
  );
};

export const publicGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectIsLoggedIn).pipe(
    take(1),
    map(isLoggedIn => isLoggedIn ? router.createUrlTree(['/shop']) : true)
  );
};

export const staffGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectRole).pipe(
    take(1),
    map(role => (role === 'STAFF' || role === 'ADMIN') || router.createUrlTree(['/']))
  );
};

export const adminGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectRole).pipe(
    take(1),
    map(role => role === 'ADMIN' || router.createUrlTree(['/']))
  );
};
