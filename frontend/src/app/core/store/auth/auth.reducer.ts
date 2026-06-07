import { createReducer, on } from '@ngrx/store';
import { User } from '../../models';
import { setUser, clearUser, setAccessToken } from './auth.actions';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
}

const initialState: AuthState = { user: null, accessToken: null };

export const authReducer = createReducer(
  initialState,
  on(setUser, (state, { user }) => ({ ...state, user })),
  on(setAccessToken, (state, { token }) => ({ ...state, accessToken: token })),
  on(clearUser, () => initialState),
);
