import { Platform } from 'react-native';

// Build BASE safely
function normalizeBase(raw: string | undefined) {
  let s = (raw || '').trim().replace(/[<>"']/g, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  let url: URL;
  try { url = new URL(s); } catch { throw new Error(`Bad EXPO_PUBLIC_API_URL: ${raw}`); }
  if (Platform.OS === 'android' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    url.hostname = '10.0.2.2';
  }
  return url.toString().replace(/\/+$/, '');
}
const BASE = normalizeBase(process.env.EXPO_PUBLIC_API_URL);
console.log('API BASE =', BASE || '(unset)');

async function http<T=any>(path: string, init?: RequestInit) {
  if (!BASE) throw new Error('EXPO_PUBLIC_API_URL not set (client/.env). Restart Expo with -c.');
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' }, ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} on ${path}${text ? ` — ${text.slice(0,200)}` : ''}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? (await res.json() as T) : (await res.text() as any as T);
}

export const getAccounts = () => http('/api/transactions/accounts');
export const scanSubscriptions = (accountId: string) => http(`/api/subsense/scan/${encodeURIComponent(accountId)}`);

// Optional: judge demo button
export const provisionDemo = async () => {
  const res = await fetch(`${BASE}/api/demo/provision`, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Provision failed — HTTP ${res.status}${text ? `: ${text.slice(0,200)}` : ''}`);
  }
  return res.json();
};
