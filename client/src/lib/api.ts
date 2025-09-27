const BASE = process.env.EXPO_PUBLIC_API_URL;
console.log('API BASE =', BASE); // Verify it's not undefined

async function http<T = any>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new Error('EXPO_PUBLIC_API_URL is missing. Check client/.env and restart with -c.');
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  return res.json();
}

export function getAccounts() {
  return http('/api/transactions/accounts');
}

export function scanSubscriptions(accountId: string) {
  return http(`/api/subsense/scan/${accountId}`);
}

export function simulateCancel(payload: {
  fromAccountId: string; toAccountId: string; amount: number;
}) {
  return http('/api/subsense/simulate-cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
