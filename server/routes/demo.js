import express from 'express';
import axios from 'axios';

const router = express.Router();
const base = process.env.NESSIE_BASE_URL;
const key  = process.env.NESSIE_KEY;

function extractId(data) {
  const obj = data?.objectCreated || data?.customer || data?.data || data;
  return obj?._id || obj?.id || null;
}

async function ensureDemoCustomer() {
  const rc = await axios.get(`${base}/customers`, { params: { key } });
  const list = Array.isArray(rc.data) ? rc.data : [];
  const existing = list.find(c =>
    c.first_name === 'Anya' && c.last_name === 'Demo' &&
    c?.address?.street_name === 'Hackathon Way'
  );
  if (existing) return existing._id || existing.id;

  const r = await axios.post(`${base}/customers`, {
    first_name: 'Anya',
    last_name: 'Demo',
    address: { street_number:'1', street_name:'Hackathon Way', city:'Atlanta', state:'GA', zip:'30332' }
  }, { params: { key } });
  const id = extractId(r.data);
  if (!id) throw new Error('Could not create customer');
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
  const r = await axios.post(`${base}/customers/${customerId}/accounts`,
    { type, nickname, rewards:0, balance },
    { params: { key } });
  return r.data;
}

async function getPurchases(accountId) {
  const r = await axios.get(`${base}/accounts/${accountId}/purchases`, { params: { key } });
  return Array.isArray(r.data) ? r.data : [];
}

async function seedPurchasesIfEmpty(accountId) {
  const have = await getPurchases(accountId);
  if (have.length) return { created: 0, note: 'Already has purchases' };

  const items = [
    { description: 'NETFLIX', amount: 15.99 },
    { description: 'SPOTIFY', amount:  9.99 },
    { description: 'ICLOUD STORAGE', amount: 2.99 },

  ];
  const today = new Date();
  let created = 0;

  for (const it of items) {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today); d.setMonth(d.getMonth() - i);
      const body = {
        medium: 'balance',
        purchase_date: d.toISOString().slice(0,10),
        amount: it.amount,
        status: 'pending',
        description: it.description, // no merchant_id (your env rejected it)
      };
      try {
        await axios.post(`${base}/accounts/${accountId}/purchases`, body, { params: { key } });
        created++;
      } catch (e) {
        // keep seeding others; log server-side
        console.warn('[demo] purchase seed failed:', e?.response?.status, e?.response?.data || e.message);
      }
    }
  }
  return { created };
}

/** POST /api/demo/provision */
router.post('/provision', async (_req, res) => {
  try {
    const customerId = await ensureDemoCustomer();
    const checking = await ensureAccount(customerId, { type:'Checking', nickname:'Checking', balance: 1200 });
    const savings  = await ensureAccount(customerId, { type:'Savings',  nickname:'Savings',  balance: 5000 });

    const chkId = checking._id || checking.id;
    const seeded = await seedPurchasesIfEmpty(chkId);

    res.json({
      customerId,
      accounts: [
        { _id: chkId, nickname: checking.nickname || 'Checking', type: checking.type, balance: checking.balance ?? 0 },
        { _id: savings._id || savings.id, nickname: savings.nickname || 'Savings', type: savings.type, balance: savings.balance ?? 0 },
      ],
      purchasesSeeded: seeded.created,
      message: seeded.created ? `Seeded ${seeded.created} purchases on Checking` : (seeded.note || 'No purchases created'),
    });
  } catch (e) {
    const st = e?.response?.status || 500;
    res.status(st).json({ error: 'Provision failed', detail: e?.response?.data || e.message });
  }
});

export default router;
