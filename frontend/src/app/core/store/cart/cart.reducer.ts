import { createReducer, on } from '@ngrx/store';
import { Cart } from '../../models';
import { loadCartSuccess, clearCartStore } from './cart.actions';

export interface CartState {
  cart: Cart | null;
}

const initialState: CartState = { cart: null };

export const cartReducer = createReducer(
  initialState,
  on(loadCartSuccess, (state, { cart }) => ({ ...state, cart })),
  on(clearCartStore, () => initialState),
);
