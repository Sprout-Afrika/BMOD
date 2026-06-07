import { createSelector, createFeatureSelector } from '@ngrx/store';
import { AuthState } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>('auth');
export const selectUser = createSelector(selectAuthState, s => s.user);
export const selectAccessToken = createSelector(selectAuthState, s => s.accessToken);
export const selectIsLoggedIn = createSelector(selectAuthState, s => !!s.accessToken && !!s.user);
export const selectRole = createSelector(selectAuthState, s => s.user?.role ?? null);
export const selectCurrency = createSelector(selectAuthState, s => s.user?.preferred_currency ?? 'NGN');
