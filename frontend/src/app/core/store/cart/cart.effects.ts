import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, map, catchError, of } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { loadCart, loadCartSuccess, loadCartFailure } from './cart.actions';

@Injectable()
export class CartEffects {
  private actions$ = inject(Actions);
  private cartService = inject(CartService);

  loadCart$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCart),
      switchMap(() =>
        this.cartService.getCart().pipe(
          map(cart => loadCartSuccess({ cart })),
          catchError(() => of(loadCartFailure()))
        )
      )
    )
  );
}
