// server/routes/demo.js
import express from 'express';
import axios from 'axios';

const router = express.Router();
const base = process.env.NESSIE_BASE_URL;      // e.g. http://api.nessieisreal.com
const key  = process.env.NESSIE_KEY;

function requireEnv() {
  if (!base || !key) throw new Error('NESSIE_BASE_URL or NESSIE_KEY missing');
}
function extractId(data) {
  const obj = data?.objectCreated || data?.customer || data?.data || data;
  return obj?._id || obj?.id || null;
}

async function findDemoCustomer() {
  const r = await axios.get(`${base}/customers`, { params: { key } });
  const customers = Array.isArray(r.data) ? r.data : [];
  // Find the most recent “Anya Demo” at our demo address
  const matches = customers.filter(
    c => c.first_name === 'Anya' &&
         c.last_name  === 'Demo' &&
         c?.address?.street_name === 'Hackathon Way' &&
         c?.address?.zip === '30332'
  );
  return matches[matches.length - 1] || null;
}

async function ensureDemoCustomer() {
  const existing = await findDemoCustomer();
  if (existing) return existing._id || existing.id;
  const rc = await axios.post(`${base}/customers`, {
    first_name: 'Anya',
    last_name: 'Demo',
    address: {
      street_number: '1',
      street_name: 'Hackathon Way',
      city: 'Atlanta', state: 'GA', zip: '30332'
    }
  }, { params: { key } });
  const id = extractId(rc.data);
  if (!id) throw new Error('Could not create customer (unexpected payload)');
  return id;
}

async function listAccounts(customerId) {
  const r = await axios.get(`${base}/customers/${customerId}/accounts`, { params: { key } });
  return Array.isArray(r.data) ? r.data : [];
}

async function ensureAccount(customerId, { type, nickname, balance }) {
  const existing = await listAccounts(customerId);
  const found = existing.find(a => (a.nickname || a.type) === nickname);
  if (found) return found;
  const ra = await axios.post(`${base}/customers/${customerId}/accounts`,
    { type, nickname, rewards: 0, balance },
    { params: { key } });
  return ra.data;
}

async function getPurchases(accountId) {
  const r = await axios.get(`${base}/accounts/${accountId}/purchases`, { params: { key } });
  return Array.isArray(r.data) ? r.data : [];
}

async function seedMonthlyPurchasesIfEmpty(accountId) {
  const have = await getPurchases(accountId);
  if (have.length) return 0; // already has data — skip seeding

  const items = [
    { description: 'NETFLIX', amount: 15.99 },
    { description: 'SPOTIFY', amount:  9.99 },
    { description: 'ICLOUD STORAGE', amount: 2.99 },
  ];
  const created = [];
  const today = new Date();

  for (const it of items) {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - i);
      const body = {
        merchant_id: it.description,         // stand-in label
        medium: 'balance',
        purchase_date: d.toISOString().slice(0,10),
        amount: it.amount,
        status: 'pending',
        description: it.description,
      };
      const url = `${base}/accounts/${accountId}/purchases`;
      const r = await axios.post(url, body, { params: { key } });
      created.push(r.data);
    }
  }
  return created.length;
}

/**
 * POST /api/demo/provision
 * Creates (if needed):
 *  - Demo customer "Anya Demo"
 *  - 2 accounts (Checking + Savings)
 *  - 6 months of Netflix/Spotify/iCloud on Checking (if empty)
 * Returns IDs so the app can immediately use them.
 */
router.post('/provision', async (_req, res) => {
  try {
    requireEnv();

    const customerId = await ensureDemoCustomer();

    const checking = await ensureAccount(customerId, { type: 'Checking', nickname: 'Checking', balance: 1200 });
    const savings  = await ensureAccount(customerId, { type: 'Savings',  nickname: 'Savings',  balance: 5000 });

    const seededCount = await seedMonthlyPurchasesIfEmpty(checking._id || checking.id);

    res.json({
      customerId,
      accounts: [
        { _id: checking._id || checking.id, nickname: checking.nickname || checking.type, type: checking.type, balance: checking.balance ?? 0 },
        { _id: savings._id  || savings.id,  nickname: savings.nickname  || savings.type,  type: savings.type,  balance: savings.balance  ?? 0 },
      ],
      purchasesSeeded: seededCount,
      message: seededCount ? `Seeded ${seededCount} purchases on Checking` : 'Accounts already had purchases; skipped seeding',
    });
  } catch (e) {
    const status = e?.response?.status || 500;
    res.status(status).json({ error: 'Provision failed', detail: e?.response?.data || e.message });
  }
});

export default router;
