// server/routes/subsense.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

const base = process.env.NESSIE_BASE_URL;   // http://api.nessieisreal.com
const key  = process.env.NESSIE_KEY;

/* ---- Simple monthly recurrence detector ---- */
function detectRecurring(txns = []) {
  const DAY = 1000 * 60 * 60 * 24;
  const groups = new Map(); // key: MERCHANT-amount -> [dates]

  for (const t of txns) {
    const merchant = String(
      t.merchant?.name ||
      t.merchant ||
      t.description ||
      t.payee ||
      t.merchant_id ||
      'UNKNOWN'
    ).trim().toUpperCase();

    const amount = Number(
      t.amount ??
      t.purchase_amount ??
      t.total ??
      0
    );

    const dateStr =
      t.purchase_date ||
      t.transaction_date ||
      t.date ||
      t.created_at;

    const d = new Date(dateStr || Date.now());
    if (Number.isNaN(d.getTime())) continue;

    const key = `${merchant}-${amount.toFixed(2)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }

  const subs = [];
  for (const [key, dates] of groups) {
    dates.sort((a, b) => a - b);
    if (dates.length < 3) continue;

    const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / DAY);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    if (avg >= 27 && avg <= 33) {
      const [merchant, amt] = key.split('-');
      const last = dates[dates.length - 1];
      const next = new Date(last.getTime() + 30 * DAY);

      subs.push({
        merchant,
        amount: Number(amt),
        cadence: 'monthly',
        lastDate: last.toISOString().slice(0, 10),
        nextDate: next.toISOString().slice(0, 10),
      });
    }
  }
  return subs;
}

/* ---- ROUTES ---- */

// GET /api/subsense/scan/:accountId  -> purchases from Nessie -> detect recurring
router.get('/scan/:accountId', async (req, res) => {
  const { accountId } = req.params;

  try {
    // Nessie: GET /accounts/{accountId}/purchases?key=...
    const r = await axios.get(`${base}/accounts/${accountId}/purchases`, { params: { key } });
    const purchases = Array.isArray(r.data) ? r.data : [];

    const subs = detectRecurring(purchases);
    res.json(subs);
  } catch (e) {
    const status = e?.response?.status || 500;
    const payload = e?.response?.data || e.message;
    console.error('Scan error:', status, payload);
    if (status === 404) {
      return res.status(404).json({ error: `No purchases found for account ${accountId}` });
    }
    if (status === 401 || status === 403) {
      return res.status(status).json({ error: 'Invalid or unauthorized Nessie API key' });
    }
    res.status(status).json({ error: 'Failed to scan subscriptions' });
  }
});

export default router;
