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
      city: 'Atlanta',
      state: 'GA',
      zip: '30332'
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
    { params: { key } }
  );
  return ra.data;
}

/* ---------------- Merchants (create if needed) ---------------- */
// Nessie often requires merchant_id to be a real merchant document _id.
async function createMerchant(name) {
  // Minimal merchant body (works in most Nessie envs)
  const body = {
    name,
    category: "subscription",
    address: {
      street_number: "1",
      street_name: "Market St",
      city: "San Francisco",
      state: "CA",
      zip: "94103"
    },
    geocode: { lat: 37.7749, lng: -122.4194 }
  };
  const r = await axios.post(`${base}/merchants`, body, { params: { key } });
  const id = extractId(r.data);
  if (!id) throw new Error(`Could not create merchant: ${name}`);
  return { _id: id };
}

async function ensureMerchants(names) {
  const out = {};
  for (const name of names) {
    try {
      // Try to create blindly; if your key/env already has one, this still returns a new id
      const m = await createMerchant(name);
      out[name] = m._id;
    } catch (e) {
      // As a fallback, try without geocode/category or log and continue
      console.warn('[demo] merchant create failed for', name, e?.response?.status, e?.response?.data || e.message);
      // last resort: allow purchase without merchant_id; the purchase seeder below tries both shapes
      out[name] = null;
    }
  }
  return out; // name -> merchantId | null
}

/* ---------------- Purchases seeding ---------------- */
async function getPurchases(accountId) {
  const r = await axios.get(`${base}/accounts/${accountId}/purchases`, { params: { key } });
  return Array.isArray(r.data) ? r.data : [];
}

async function seedMonthlyPurchasesIfEmpty(accountId) {
  const have = await getPurchases(accountId);
  if (have.length) return { created: 0, note: 'Account already has purchases; skipping' };

  const items = [
    { description: 'NETFLIX', amount: 15.99 },
    { description: 'SPOTIFY', amount:  9.99 },
    { description: 'ICLOUD STORAGE', amount: 2.99 },
  ];

  // Ensure real merchants (best effort)
  const merchantIds = await ensureMerchants(items.map(i => i.description));

  const today = new Date();
  let created = 0, attempts = 0;

  for (const it of items) {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - i);
      const dateISO = d.toISOString().slice(0,10);

      const bodyA = {
        merchant_id: merchantIds[it.description], // real _id (or null)
        medium: 'balance',
        purchase_date: dateISO,
        amount: it.amount,
        status: 'pending',
        description: it.description,
      };
      const bodyB = {
        medium: 'balance',
        purchase_date: dateISO,
        amount: it.amount,
        status: 'pending',
        description: it.description,
      };

      attempts++;
      try {
        // If we have a merchant_id, try bodyA first. If null, try bodyB first.
        if (bodyA.merchant_id) {
          await axios.post(`${base}/accounts/${accountId}/purchases`, bodyA, { params: { key } });
        } else {
          await axios.post(`${base}/accounts/${accountId}/purchases`, bodyB, { params: { key } });
        }
        created++;
      } catch (e1) {
        try {
          // Fallback to the other shape
          const alt = bodyA.merchant_id ? bodyB : bodyA;
          await axios.post(`${base}/accounts/${accountId}/purchases`, alt, { params: { key } });
          created++;
        } catch (e2) {
          console.warn('[demo] purchase post failed (A/B):',
            e1?.response?.status, e1?.response?.data || e1.message,
            '|',
            e2?.response?.status, e2?.response?.data || e2.message
          );
        }
      }
    }
  }

  return { created, attempts };
}

/**
 * POST /api/demo/provision
 * - Ensures demo customer "Anya Demo"
 * - Ensures Checking + Savings accounts
 * - Seeds 6 months of purchases on Checking using valid merchant_id (fallbacks if needed)
 */
router.post('/provision', async (_req, res) => {
  try {
    requireEnv();

    const customerId = await ensureDemoCustomer();

    const checking = await ensureAccount(customerId, { type: 'Checking', nickname: 'Checking', balance: 1200 });
    const savings  = await ensureAccount(customerId, { type: 'Savings',  nickname: 'Savings',  balance: 5000 });

    const checkingId = checking._id || checking.id;
    const seed = await seedMonthlyPurchasesIfEmpty(checkingId);

    res.json({
      customerId,
      accounts: [
        { _id: checkingId, nickname: checking.nickname || checking.type, type: checking.type, balance: checking.balance ?? 0 },
        { _id: savings._id || savings.id, nickname: savings.nickname || savings.type, type: savings.type, balance: savings.balance ?? 0 },
      ],
      purchasesSeeded: seed.created,
      attempts: seed.attempts,
      message: seed.created ? `Seeded ${seed.created} purchases on Checking` : (seed.note || 'No purchases created'),
    });
  } catch (e) {
    const status = e?.response?.status || 500;
    const payload = e?.response?.data || e.message;
    console.error('[demo] provision error:', status, payload);
    res.status(status).json({ error: 'Provision failed', detail: payload });
  }
});

export default router;
