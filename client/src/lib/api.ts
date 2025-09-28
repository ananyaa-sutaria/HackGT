// client/src/lib/api.ts
import { Platform } from 'react-native';
import { getToken } from './auth';

/* ---------- BASE handling ---------- */
function normalizeBase(raw?: string) {
  let s = (raw || '').trim().replace(/[<>"']/g, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new Error(
      `Bad EXPO_PUBLIC_API_URL: ${raw}. Examples:\n` +
      `  http://localhost:5000 (web/iOS sim)\n` +
      `  http://10.0.2.2:5000   (Android emulator)\n` +
      `  http://<your-mac-ip>:5000 (phone on Wi-Fi)`
    );
  }
  // Android emulator cannot reach host "localhost"
  if (
    Platform.OS === 'android' &&
    (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
  ) {
    u.hostname = '10.0.2.2';
  }
  // strip trailing slash
  return u.toString().replace(/\/+$/, '');
}

export const BASE = normalizeBase(process.env.EXPO_PUBLIC_API_URL);
console.log('API BASE =', BASE || '(unset)');

/* ---------- core fetch helper ---------- */
export async function http<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE) {
    throw new Error('EXPO_PUBLIC_API_URL not set. Edit client/.env and restart Expo with -c.');
  }

  const method = (init.method || 'GET').toUpperCase();
  let url = `${BASE}${path}`;

  // Bust caches for GET so cancel/resume/reset reflect instantly
  if (method === 'GET') {
    url += (url.includes('?') ? '&' : '?') + `_ts=${Date.now()}`;
  }

  // Only attach Authorization on non-public endpoints (reduces CORS preflights)
  const publicPrefixes = ['/health', '/api/transactions', '/api/subsense', '/api/demo'];
  const wantsAuth = !publicPrefixes.some(p => path.startsWith(p));

  const token = await getToken();

  // Build headers (don’t overwrite caller’s headers)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
    ...(wantsAuth && token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // If there’s a body and no content-type, default to JSON
  if (method !== 'GET' && init.body && !('Content-Type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    console.log('→', method, url);
    const res = await fetch(url, {
      ...init,
      headers,
      // help the browser not cache and always go to network
      cache: 'no-store' as RequestCache,
      mode: 'cors' as RequestMode,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} on ${path}${text ? ` — ${text.slice(0, 180)}` : ''}`);
    }

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  } catch (err: any) {
    // Improve the generic “Failed to fetch”
    if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
      throw new Error(
        `Failed to fetch\n` +
        `URL: ${url}\n` +
        `• Is the server running on this host/port?\n` +
        `• Mixed content? Use http://localhost:19006 for Expo Web.\n` +
        `• On phone? Set EXPO_PUBLIC_API_URL to your Mac’s IP.`
      );
    }
    throw err;
  }
}

/* ---------- API helpers ---------- */
export const getAccounts = () => http('/api/transactions/accounts');

export const scanSubscriptions = (id: string) =>
  http(`/api/subsense/scan/${encodeURIComponent(id)}`);

export const provisionDemo = () =>
  http('/api/demo/provision', { method: 'POST' });

/* ---------- Auth ---------- */
export const loginApi = (email: string, pin: string) =>
  http('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pin }),
  });

export const meApi = () => http('/api/auth/me');

// simple health check used by Settings → "Ping API"
export const ping = () => http('/health');

/* ---------- Subscription actions ---------- */
export const cancelSubscription = (p: { accountId: string; merchant: string; amount: number }) =>
  http('/api/subsense/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });

export const resumeSubscription = (p: { accountId: string; merchant: string; amount?: number }) =>
  http('/api/subsense/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });

export const snoozeSubscription = (p: { accountId: string; merchant: string; amount?: number; days?: number }) =>
  http('/api/subsense/snooze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });

export const resetApi = () =>
  http('/api/subsense/reset', { method: 'POST' });
