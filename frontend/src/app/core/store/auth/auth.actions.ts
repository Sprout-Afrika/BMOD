import { createAction, props } from '@ngrx/store';
import { User } from '../../models';

export const setUser = createAction('[Auth] Set User', props<{ user: User }>());
export const clearUser = createAction('[Auth] Clear User');
export const setAccessToken = createAction('[Auth] Set Access Token', props<{ token: string }>());
