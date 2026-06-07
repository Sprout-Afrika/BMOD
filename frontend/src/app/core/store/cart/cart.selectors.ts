import { createSelector, createFeatureSelector } from '@ngrx/store';
import { CartState } from './cart.reducer';

export const selectCartState = createFeatureSelector<CartState>('cart');
export const selectCart = createSelector(selectCartState, s => s.cart);
export const selectCartItemCount = createSelector(selectCartState, s => s.cart?.item_count ?? 0);
export const selectCartTotal = createSelector(selectCartState, s => s.cart?.total_ngn ?? 0);
