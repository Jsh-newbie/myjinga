export const MARKETING_LANDING_PATH = '/landing.html';
export const AUTH_SIGNIN_PATH = '/auth/signin';
export const AUTH_SIGNUP_PATH = '/auth/signup';
export const DASHBOARD_HOME_PATH = '/dashboard';

export function resolveAuthPageRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? DASHBOARD_HOME_PATH : null;
}

export function resolveProtectedPageRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? null : AUTH_SIGNIN_PATH;
}
