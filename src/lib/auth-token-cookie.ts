export const AUTH_TOKEN_COOKIE_NAME = "__stowage_auth_token";
const AUTH_TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secureCookieAttribute() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.protocol === "https:" ? "; Secure" : "";
}

export function setAuthTokenCookie(token: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie =
    `${AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; ` +
    `Path=/; Max-Age=${AUTH_TOKEN_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax` +
    secureCookieAttribute();
}

export function clearAuthTokenCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie =
    `${AUTH_TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax` +
    secureCookieAttribute();
}

export function syncAuthTokenCookie(token: string | null) {
  if (token) {
    setAuthTokenCookie(token);
    return;
  }

  clearAuthTokenCookie();
}
