const BASE = process.env.EXPO_PUBLIC_API_URL;

// Fetch all accounts
export async function getAccounts() {
  const res = await fetch(`${BASE}/api/transactions/accounts`);
  return res.json();
}

// Fetch subscriptions for a specific account
export async function scanSubscriptions(accountId: string) {
  const res = await fetch(`${BASE}/api/subsense/scan/${accountId}`);
  return res.json();
}

// Simulate cancel
export async function simulateCancel(payload: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
}) {
  const res = await fetch(`${BASE}/api/subsense/simulate-cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}
