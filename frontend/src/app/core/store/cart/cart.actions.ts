import { createAction, props } from '@ngrx/store';
import { Cart } from '../../models';

export const loadCart = createAction('[Cart] Load');
export const loadCartSuccess = createAction('[Cart] Load Success', props<{ cart: Cart }>());
export const loadCartFailure = createAction('[Cart] Load Failure');
export const clearCartStore = createAction('[Cart] Clear Store');
