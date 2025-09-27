// client/src/lib/api.ts
const RAW = (process.env.EXPO_PUBLIC_API_URL || '').trim();
const BASE = RAW.replace(/[<>"']/g, ''); // sanitize
console.log('API BASE =', BASE || '(unset)');

async function http<T = any>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new Error('EXPO_PUBLIC_API_URL missing (client/.env)');
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  return res.json();
}

export const ping = () => http('/health');
export const getAccounts = () => http('/api/transactions/accounts');

export const scanSubscriptions = (accountId: string) =>
  http(`/api/subsense/scan/${encodeURIComponent(accountId)}`);

export const simulateCancel = (payload: {
  fromAccountId: string; toAccountId: string; amount: number;
}) =>
  http('/api/subsense/simulate-cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });


  export const seedDemoSubs = (accountId: string) =>
    fetch(`${process.env.EXPO_PUBLIC_API_URL?.replace(/[<>"']/g, '')}/api/subsense/seed/${encodeURIComponent(accountId)}`, {
      method: 'POST'
    }).then(r => {
      if (!r.ok) throw new Error('Seed failed');
      return r.json();
    });
  
  export const cancelSubscription = (accountId: string, merchant: string) =>
    fetch(`${process.env.EXPO_PUBLIC_API_URL?.replace(/[<>"']/g, '')}/api/subsense/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, merchant }),
    }).then(r => {
      if (!r.ok) throw new Error('Cancel failed');
      return r.json();
    });
  