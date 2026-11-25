import { useStudioStore } from '../store/useStudioStore';

const API_BASE_STORAGE_KEY = 'coupled-api-base-url';
const JWT_STORAGE_KEY = 'coupled-auth-jwt';
const COOKIE_MODE_STORAGE_KEY = 'coupled-auth-cookie-mode';

const DEFAULT_API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

let memoryJwt: string | null = null;
try {
  memoryJwt = window.sessionStorage.getItem(JWT_STORAGE_KEY);
} catch {
  memoryJwt = null;
}

export function getApiBaseUrl(): string {
  try {
    const override = window.localStorage.getItem(API_BASE_STORAGE_KEY);
    if (override !== null) {
      return override.replace(/\/+$/, '');
    }
  } catch {
    // ignore storage access issues
  }
  return DEFAULT_API_BASE.replace(/\/+$/, '');
}

export function setApiBaseUrlOverride(url: string | null): void {
  try {
    if (url === null) {
      window.localStorage.removeItem(API_BASE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(API_BASE_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
    }
  } catch {
    // ignore storage errors
  }
}

export function getStoredJwt(): string | null {
  return memoryJwt;
}

export function setStoredJwt(token: string | null): void {
  memoryJwt = token;
  try {
    if (token) {
      window.sessionStorage.setItem(JWT_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(JWT_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function isCookieAuthMode(): boolean {
  try {
    return window.localStorage.getItem(COOKIE_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setCookieAuthMode(enabled: boolean): void {
  try {
    window.localStorage.setItem(COOKIE_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export class ApiHttpError extends Error {
  status: number;
  detail: string;
  body: unknown;

  constructor(status: number, detail: string, body: unknown = null) {
    super(detail);
    this.name = 'ApiHttpError';
    this.status = status;
    this.detail = detail;
    this.body = body;
  }
}

function buildAuthHeaders(extra?: HeadersInit, skipJsonContentType = false): Headers {
  const headers = new Headers(extra);
  const jwt = getStoredJwt();
  if (jwt && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${jwt}`);
  }
  if (!skipJsonContentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

function getCredentialsMode(): RequestCredentials {
  if (getStoredJwt()) return 'omit';
  return isCookieAuthMode() ? 'include' : 'same-origin';
}

function extractJwtFromHeaders(headers: Headers): void {
  const jwt = headers.get('set-auth-jwt');
  if (jwt && jwt.trim()) {
    setStoredJwt(jwt.trim());
  }
}

function pushTrace(
  method: string,
  path: string,
  status: number | null,
  durationMs: number,
  ok: boolean,
  preview: string,
): void {
  useStudioStore.getState().pushApiTrace({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    method,
    path,
    status,
    durationMs: Math.round(durationMs),
    ok,
    preview: preview.slice(0, 260),
  });
}

function formatErrorDetail(status: number, body: unknown, fallbackText: string): string {
  if (body && typeof body === 'object') {
    const rec = body as Record<string, unknown>;
    if (typeof rec.detail === 'string') return rec.detail;
    if (typeof rec.error === 'string') return rec.error;
    if (typeof rec.message === 'string') return rec.message;
    if (Array.isArray(rec.detail)) {
      return rec.detail
        .map((item) =>
          item && typeof item === 'object' && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : JSON.stringify(item),
        )
        .join('; ');
    }
  }
  return fallbackText || `Request failed with HTTP ${status}`;
}

export async function apiRequest<T = unknown>(
  path: string,
  init: RequestInit & { skipJsonContentType?: boolean; rawResponseType?: 'json' | 'text' } = {},
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const url = resolveApiUrl(path);
  const isFormData = init.body instanceof FormData;
  const headers = buildAuthHeaders(init.headers, init.skipJsonContentType || isFormData || !init.body);
  const started = performance.now();

  try {
    const res = await fetch(url, {
      ...init,
      method,
      headers,
      credentials: init.credentials ?? getCredentialsMode(),
    });
    extractJwtFromHeaders(res.headers);

    const elapsed = performance.now() - started;
    const contentType = res.headers.get('content-type') ?? '';
    const text = await res.text();
    let parsed: unknown = text;
    if (init.rawResponseType !== 'text' && (contentType.includes('application/json') || text.startsWith('{') || text.startsWith('['))) {
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }
    }

    pushTrace(method, path, res.status, elapsed, res.ok, text || res.statusText);

    if (!res.ok) {
      throw new ApiHttpError(res.status, formatErrorDetail(res.status, parsed, text), parsed);
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof ApiHttpError) throw err;
    const elapsed = performance.now() - started;
    const msg = err instanceof Error ? err.message : String(err);
    pushTrace(method, path, null, elapsed, false, msg);
    throw err;
  }
}

export async function apiRawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const url = resolveApiUrl(path);
  const isFormData = init.body instanceof FormData;
  const headers = buildAuthHeaders(init.headers, isFormData || !init.body);
  const started = performance.now();

  const res = await fetch(url, {
    ...init,
    method,
    headers,
    credentials: init.credentials ?? getCredentialsMode(),
  });
  extractJwtFromHeaders(res.headers);
  const elapsed = performance.now() - started;
  pushTrace(method, path, res.status, elapsed, res.ok, res.ok ? `stream/binary (${res.headers.get('content-type') ?? 'ok'})` : res.statusText);
  return res;
}

export async function downloadAuthenticatedExport(path: string, fallbackName = 'export.bin'): Promise<string> {
  const url = resolveApiUrl(path);
  const headers = buildAuthHeaders(undefined, true);
  const started = performance.now();
  const res = await fetch(url, {
    headers,
    credentials: getCredentialsMode(),
  });
  const elapsed = performance.now() - started;

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    pushTrace('GET', path, res.status, elapsed, false, errText);
    throw new ApiHttpError(res.status, errText || `Export failed (${res.status})`);
  }

  const disp = res.headers.get('Content-Disposition') ?? '';
  const match = disp.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match?.[1] ?? fallbackName;

  const blob = await res.blob();
  pushTrace('GET', path, res.status, elapsed, true, `Downloaded ${filename} (${blob.size} bytes)`);

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);

  return filename;
}
