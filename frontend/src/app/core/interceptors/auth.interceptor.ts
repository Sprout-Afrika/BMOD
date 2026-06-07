import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { BehaviorSubject, switchMap, catchError, throwError, take, filter, EMPTY } from 'rxjs';
import { selectAccessToken } from '../store/auth/auth.selectors';
import { setAccessToken, clearUser } from '../store/auth/auth.actions';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

// Module-scoped refresh state — one pending refresh at a time
const refreshInProgress$ = new BehaviorSubject<boolean>(false);
const newToken$ = new BehaviorSubject<string | null>(null);

const addToken = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const store = inject(Store);
  const router = inject(Router);
  const http = inject(HttpClient);

  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  // Never intercept the refresh call itself to avoid infinite loop
  if (req.url.includes('/auth/refresh')) return next(req);

  return store.select(selectAccessToken).pipe(
    take(1),
    switchMap(token => {
      const authReq = token ? addToken(req, token) : req;

      return next(authReq).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status !== 401) return throwError(() => err);

          if (refreshInProgress$.getValue()) {
            // Queue behind the in-flight refresh
            return newToken$.pipe(
              filter(t => t !== null),
              take(1),
              switchMap(t => next(addToken(req, t!)))
            );
          }

          refreshInProgress$.next(true);
          newToken$.next(null);

          return http
            .post<{ access_token: string }>(
              `${environment.apiUrl}/auth/refresh`,
              {},
              { withCredentials: true }
            )
            .pipe(
              switchMap(res => {
                store.dispatch(setAccessToken({ token: res.access_token }));
                newToken$.next(res.access_token);
                refreshInProgress$.next(false);
                return next(addToken(req, res.access_token));
              }),
              catchError(refreshErr => {
                refreshInProgress$.next(false);
                newToken$.next(null);
                store.dispatch(clearUser());
                router.navigate(['/auth/login']);
                return throwError(() => refreshErr);
              })
            );
        })
      );
    })
  );
};
