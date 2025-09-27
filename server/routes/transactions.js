// server/routes/transactions.js
console.log('[nessie] base=', process.env.NESSIE_BASE_URL, 'key=', String(process.env.NESSIE_KEY).slice(0,4)+'…', '(len='+String(process.env.NESSIE_KEY||'').length+')');

import express from 'express';
import axios from 'axios';

const router = express.Router();

const base = process.env.NESSIE_BASE_URL;  // e.g. http://api.nessieisreal.com
const key  = process.env.NESSIE_KEY;

function normAccounts(arr = []) {
  return arr.map(a => ({
    _id: a._id || a.id,
    nickname: a.nickname || a.type || 'Account',
    type: a.type || 'account',
    balance: a.balance ?? a.rewards ?? 0,
  }));
}

// GET /api/transactions/accounts
// 1) Try "enterprise" accounts (some keys support /accounts?key=...)
// 2) Fallback: customers -> accounts per customer
router.get('/accounts', async (_req, res) => {
  if (!base || !key) return res.status(500).json({ error: 'NESSIE_BASE_URL or NESSIE_KEY missing' });

  try {
    // Try global accounts (may require enterprise key)
    const r = await axios.get(`${base}/accounts`, { params: { key } });
    const data = Array.isArray(r.data) ? r.data : [];
    console.log(`[nessie] /accounts -> ${data.length}`);
    if (data.length) return res.json(normAccounts(data));
  } catch (e) {
    console.warn('[nessie] /accounts failed:', e?.response?.status, e?.response?.data || e.message);
  }

  // Fallback: enumerate customers then their accounts
  try {
    const rc = await axios.get(`${base}/customers`, { params: { key } });
    const customers = Array.isArray(rc.data) ? rc.data : [];
    console.log(`[nessie] /customers -> ${customers.length}`);

    const all = [];
    for (const c of customers) {
      const id = c._id || c.id;
      if (!id) continue;
      try {
        const ra = await axios.get(`${base}/customers/${id}/accounts`, { params: { key } });
        const accs = Array.isArray(ra.data) ? ra.data : [];
        console.log(`[nessie] /customers/${id}/accounts -> ${accs.length}`);
        all.push(...accs);
      } catch (e) {
        console.warn(`[nessie] accounts for customer ${id} failed:`, e?.response?.status);
      }
    }
    return res.json(normAccounts(all));
  } catch (e) {
    console.error('[nessie] customers flow failed:', e?.response?.status, e?.response?.data || e.message);
    const status = e?.response?.status || 500;
    return res.status(status).json({ error: 'Failed to fetch accounts' });
  }
});

export default router;

// POST /api/transactions/seed-nessie  -> create one customer + two accounts in Nessie
router.post('/seed-nessie', async (_req, res) => {
  try {
    if (!base || !key) return res.status(500).json({ error: 'NESSIE_BASE_URL or NESSIE_KEY missing' });

    // 1) Create a customer
    const customerBody = {
      first_name: 'Anya',
      last_name: 'Demo',
      address: {
        street_number: '1',
        street_name: 'Hackathon Way',
        city: 'Atlanta',
        state: 'GA',
        zip: '30332'
      }
    };

    const rc = await axios.post(`${base}/customers`, customerBody, { params: { key } });
    const customer = rc.data || rc.data?.data || rc.data?.customer || {};
    const customerId = customer._id || customer.id;
    if (!customerId) throw new Error('Could not create customer');

    // 2) Create two accounts for that customer
    const accountsToCreate = [
      { type: 'Checking', nickname: 'Checking', rewards: 0, balance: 1200 },
      { type: 'Savings',  nickname: 'Savings',  rewards: 0, balance: 5000 },
    ];

    const created = [];
    for (const acc of accountsToCreate) {
      try {
        const ra = await axios.post(
          `${base}/customers/${customerId}/accounts`,
          acc,
          { params: { key } }
        );
        created.push(ra.data);
      } catch (e) {
        console.warn('[nessie] create account failed:', e?.response?.status, e?.response?.data || e.message);
      }
    }

    res.json({ customerId, created: created.length });
  } catch (e) {
    console.error('[nessie] seed-nessie error:', e?.response?.status, e?.response?.data || e.message);
    res.status(e?.response?.status || 500).json({ error: 'Failed to seed Nessie data', detail: e?.response?.data || e.message });
  }
});
