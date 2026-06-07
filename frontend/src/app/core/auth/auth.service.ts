import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models';
import { setUser, clearUser, setAccessToken } from '../store/auth/auth.actions';
import { selectAccessToken } from '../store/auth/auth.selectors';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private store = inject(Store);
  private baseUrl = `${environment.apiUrl}/auth`;

  register(email: string, password: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/register`, { email, password });
  }

  verifyEmail(token: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/verify-email`, { token });
  }

  login(email: string, password: string): Observable<{ access_token: string }> {
    return this.http.post<{ access_token: string }>(`${this.baseUrl}/login`, { email, password }, { withCredentials: true }).pipe(
      tap(res => {
        this.store.dispatch(setAccessToken({ token: res.access_token }));
        this.loadCurrentUser().subscribe();
      })
    );
  }

  loadCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`).pipe(
      tap(user => this.store.dispatch(setUser({ user }))),
      catchError(() => of(null as unknown as User))
    );
  }

  updatePreferences(preferred_currency: string): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/me`, { preferred_currency }).pipe(
      tap(user => this.store.dispatch(setUser({ user })))
    );
  }

  tryRefreshOnInit(): void {
    this.refresh().pipe(catchError(() => of(null))).subscribe(res => {
      if (res) this.loadCurrentUser().subscribe();
    });
  }

  refresh(): Observable<{ access_token: string }> {
    return this.http.post<{ access_token: string }>(`${this.baseUrl}/refresh`, {}, { withCredentials: true }).pipe(
      tap(res => this.store.dispatch(setAccessToken({ token: res.access_token })))
    );
  }

  logout(): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/logout`, {}).pipe(
      tap(() => {
        this.store.dispatch(clearUser());
        this.router.navigate(['/auth/login']);
      }),
      catchError(() => {
        this.store.dispatch(clearUser());
        this.router.navigate(['/auth/login']);
        return of(null);
      })
    );
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(email: string, otp: string, new_password: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/reset-password`, { email, otp, new_password });
  }
}
