export const AUTH_TOKEN_KEY = "token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const sessionToken = window.sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (sessionToken) return sessionToken;

    const legacy = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (legacy) {
      window.sessionStorage.setItem(AUTH_TOKEN_KEY, legacy);
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      return legacy;
    }

    return null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    // Ensure tab-close logout semantics by not keeping a persistent token.
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}
