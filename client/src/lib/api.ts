import { Platform } from 'react-native';
import { getToken } from './auth';

function normalizeBase(raw?: string) {
  let s = (raw || '').trim().replace(/[<>"']/g, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new Error(`Bad EXPO_PUBLIC_API_URL: ${raw}`);
  }
  if (
    Platform.OS === 'android' &&
    (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
  ) {
    u.hostname = '10.0.2.2';
  }
  return u.toString().replace(/\/+$/, '');
}

export const BASE = normalizeBase(process.env.EXPO_PUBLIC_API_URL);
console.log('API BASE =', BASE || '(unset)');

export async function http<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE) {
    throw new Error('EXPO_PUBLIC_API_URL not set. Restart Expo with -c after editing client/.env.');
  }
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
