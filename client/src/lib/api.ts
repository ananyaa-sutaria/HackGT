import { Platform } from 'react-native';
import { getToken } from './auth';

function normalizeBase(raw?: string) {
  let s = (raw || '').trim().replace(/[<>"']/g, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  const u = new URL(s);
  if (Platform.OS === 'android' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) u.hostname = '10.0.2.2';
  return u.toString().replace(/\/+$/, '');
}
const BASE = normalizeBase(process.env.EXPO_PUBLIC_API_URL);
console.log('API BASE =', BASE || '(unset)');

export async function http<T=any>(path: string, init: RequestInit = {}) {
  if (!BASE) throw new Error('EXPO_PUBLIC_API_URL not set. Restart Expo with -c after editing client/.env.');
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} on ${path}${text ? ` — ${text.slice(0,180)}` : ''}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : (res.text() as any as T);
}

// existing exports…
export const getAccounts = () => http('/api/transactions/accounts');
export const scanSubscriptions = (id: string) => http(`/api/subsense/scan/${encodeURIComponent(id)}`);
export const provisionDemo = () => http('/api/demo/provision', { method: 'POST' });

// auth API
export const loginApi = (email: string, pin: string) =>
  http('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, pin }) });
export const meApi = () => http('/api/auth/me');
