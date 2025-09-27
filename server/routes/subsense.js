// server/routes/subsense.js
import express from 'express';

const router = express.Router();

/* ---------------- In-memory demo state ---------------- */
const mockPurchasesByAccount = new Map();   // accountId -> [{ merchant, amount, purchase_date }]
const cancelledByAccount     = new Map();   // accountId -> Set(merchant)

function cancelledSet(accountId) {
  const id = String(accountId);
  if (!cancelledByAccount.has(id)) cancelledByAccount.set(id, new Set());
  return cancelledByAccount.get(id);
}

function monthlySeries(startISO, months, merchant, amount) {
  const start = new Date(startISO);
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setMonth(d.getMonth() - i);
    out.push({ merchant, amount, purchase_date: d.toISOString().slice(0, 10) });
  }
  return out;
}

/* --------------- Simple monthly detector -------------- */
function detectRecurring(txns = []) {
  const DAY = 1000 * 60 * 60 * 24;
  const groups = new Map(); // key: MERCHANT-amount -> [dates]

  for (const t of txns) {
    const merchant = String(
      t.merchant || t.description || t.payee || 'UNKNOWN'
    ).trim().toUpperCase();
    const amount = Number(t.amount ?? t.purchase_amount ?? t.total ?? 0);
    const dateStr = t.purchase_date || t.transaction_date || t.date || t.created_at;
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

/* --------------------- Routes ------------------------- */

// Seed demo purchases for an account
// POST /api/subsense/seed/:accountId
router.post('/seed/:accountId', (req, res) => {
  const { accountId } = req.params;
  const today = new Date().toISOString().slice(0, 10);
  const demo = [
    ...monthlySeries(today, 6, 'NETFLIX', 15.99),
    ...monthlySeries(today, 6, 'SPOTIFY', 9.99),
    ...monthlySeries(today, 6, 'ICLOUD STORAGE', 2.99),
  ];
  mockPurchasesByAccount.set(String(accountId), demo);
  res.json({ created: demo.length });
});

// Mark a merchant as canceled for an account
// POST /api/subsense/cancel  { accountId, merchant }
router.post('/cancel', (req, res) => {
  const { accountId, merchant } = req.body || {};
  if (!accountId || !merchant) {
    return res.status(400).json({ error: 'accountId and merchant are required' });
  }
  cancelledSet(accountId).add(String(merchant).toUpperCase());
  res.json({ ok: true });
});

// Scan (detect recurring) for an account
// GET /api/subsense/scan/:accountId
router.get('/scan/:accountId', (req, res) => {
  const { accountId } = req.params;
  const mock = mockPurchasesByAccount.get(String(accountId)) || [];
  const subs = detectRecurring(mock);
  const canceled = cancelledSet(accountId);
  const filtered = subs.filter(s => !canceled.has(String(s.merchant).toUpperCase()));
  res.json(filtered);
});

export default router;
