/**
 * Token storage. sessionStorage is cleared when the browser tab closes.
 * Refresh tokens are still reachable by page scripts, so the admin app must stay free of
 * untrusted third-party scripts. A future hardening step is httpOnly cookies.
 */
export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

const KEY = "zubix.admin.session";

export function getSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function setSession(session: StoredSession): void {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(KEY);
}
