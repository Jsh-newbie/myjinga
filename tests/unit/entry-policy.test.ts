import { describe, expect, it } from 'vitest';

import {
  AUTH_SIGNIN_PATH,
  AUTH_SIGNUP_PATH,
  DASHBOARD_HOME_PATH,
  MARKETING_LANDING_PATH,
  resolveAuthPageRedirectPath,
  resolveProtectedPageRedirectPath,
} from '@/lib/navigation/entry-policy';

describe('entry policy', () => {
  it('keeps the web public landing route fixed', () => {
    expect(MARKETING_LANDING_PATH).toBe('/landing.html');
  });

  it('exposes shared route constants for auth and dashboard flows', () => {
    expect(AUTH_SIGNIN_PATH).toBe('/auth/signin');
    expect(AUTH_SIGNUP_PATH).toBe('/auth/signup');
    expect(DASHBOARD_HOME_PATH).toBe('/dashboard');
  });

  it('redirects authenticated users away from auth pages to dashboard', () => {
    expect(resolveAuthPageRedirectPath(true)).toBe(DASHBOARD_HOME_PATH);
    expect(resolveAuthPageRedirectPath(false)).toBeNull();
  });

  it('redirects unauthenticated users from protected pages to sign-in', () => {
    expect(resolveProtectedPageRedirectPath(false)).toBe(AUTH_SIGNIN_PATH);
    expect(resolveProtectedPageRedirectPath(true)).toBeNull();
  });
});
