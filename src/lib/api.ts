import { clearSession, getSession, setSession, type StoredSession } from "./session";

const API_BASE = "https://api.zubix.win";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: unknown };
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const current = getSession();
  if (!current) return false;

  refreshInFlight ??= (async () => {
    const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!response.ok) {
      clearSession();
      return false;
    }
    const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
    const next: StoredSession = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    setSession(next);
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * Calls the API with the stored access token. On 401 it refreshes once and retries.
 * Error bodies from the server are surfaced as ApiError with the server's message.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}, allowRetry = true): Promise<T> {
  const session = getSession();
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (session) {
    headers.set("authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_BASE}/api/v1${path}`, { ...init, headers });

  if (response.status === 401 && allowRetry && session && (await refreshSession())) {
    return apiFetch<T>(path, init, false);
  }

  if (!response.ok) {
    const envelope = (await response.json().catch(() => ({}))) as ErrorEnvelope;
    throw new ApiError(
      response.status,
      envelope.error?.code ?? "REQUEST_FAILED",
      envelope.error?.message ?? `Request failed with status ${response.status}`,
      envelope.error?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** Login does not send a bearer token, so it bypasses apiFetch's retry logic. */
export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const envelope = (await response.json().catch(() => ({}))) as ErrorEnvelope;
    throw new ApiError(
      response.status,
      envelope.error?.code ?? "LOGIN_FAILED",
      envelope.error?.message ?? "Sign-in failed",
    );
  }
  const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
  setSession({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
}

export async function logoutRemote(): Promise<void> {
  const session = getSession();
  if (session) {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    }).catch(() => undefined);
  }
  clearSession();
}

/** Downloads a text file (CSV) from an authenticated endpoint. Not JSON, so apiFetch cannot be used. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const session = getSession();
  const headers = new Headers();
  if (session) headers.set("authorization", `Bearer ${session.accessToken}`);
  const response = await fetch(`${API_BASE}/api/v1${path}`, { headers });
  if (!response.ok) {
    const envelope = (await response.json().catch(() => ({}))) as ErrorEnvelope;
    throw new ApiError(response.status, envelope.error?.code ?? "DOWNLOAD_FAILED", envelope.error?.message ?? "Download failed");
  }
  downloadText(await response.text(), filename);
}

export function downloadText(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
