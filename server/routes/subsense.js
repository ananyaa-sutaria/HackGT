// server/routes/subsense.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

/* -------------------- demo overrides (in-memory) -------------------- */
const _cancelled = new Map(); // accountId -> Set(keys)
const _snoozed   = new Map(); // accountId -> Map(key -> ISO date)

function subKey(merchant, amount) {
  const m = String(merchant || '').toLowerCase().trim();
  const a = Number(amount || 0);
  return `${m}|${a.toFixed(2)}`;
}
function getCancelSet(accountId) {
  if (!_cancelled.has(accountId)) _cancelled.set(accountId, new Set());
  return _cancelled.get(accountId);
}
function getSnoozeMap(accountId) {
  if (!_snoozed.has(accountId)) _snoozed.set(accountId, new Map());
  return _snoozed.get(accountId);
}

/* -------------------- actions -------------------- */
router.post('/cancel', (req, res) => {
  const { accountId, merchant, amount } = req.body || {};
  if (!accountId || !merchant) return res.status(400).json({ error: 'accountId and merchant required' });
  getCancelSet(accountId).add(subKey(merchant, amount));
  res.json({ ok: true });
});
router.post('/resume', (req, res) => {
  const { accountId, merchant, amount } = req.body || {};
  if (!accountId || !merchant) return res.status(400).json({ error: 'accountId and merchant required' });
  getCancelSet(accountId).delete(subKey(merchant, amount));
  res.json({ ok: true });
});
router.post('/snooze', (req, res) => {
  const { accountId, merchant, amount, days } = req.body || {};
  if (!accountId || !merchant) return res.status(400).json({ error: 'accountId and merchant required' });
  const until = new Date();
  until.setDate(until.getDate() + (Number(days) || 30));
  const iso = until.toISOString().slice(0, 10);
  getSnoozeMap(accountId).set(subKey(merchant, amount), iso);
  res.json({ ok: true, nextDate: iso });
});

/* -------------------- detect helper -------------------- */
function detectSubscriptions(purchases = []) {
  const byKey = new Map();
  for (const p of purchases) {
    const merchant = String(p?.merchant || p?.description || 'Unknown').toUpperCase();
    const amount = Math.abs(Number(p?.amount ?? p?.purchase_amount ?? 0)) || 0;
    const dateStr = p?.purchase_date || p?.transaction_date || p?.date || p?.post_date;
    const d = dateStr ? new Date(dateStr) : null;
    const key = `${merchant}|${amount.toFixed(2)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    if (d && !isNaN(d)) byKey.get(key).push(d);
  }

  const subs = [];
  for (const [key, dates] of byKey) {
    if (dates.length < 2) continue; // need at least 2 occurrences
    dates.sort((a, b) => a - b);

    // avg day gap
    let gap = 0;
    for (let i = 1; i < dates.length; i++) gap += (dates[i] - dates[i - 1]) / 86400000;
    gap = gap / Math.max(1, dates.length - 1);

    let cadence = 'monthly';
    let addDays = 30;
    if (gap < 10)            { cadence = 'weekly';    addDays = 7;  }
    else if (gap < 20)       { cadence = 'biweekly';  addDays = 14; }
    else if (gap > 60 && gap < 120) { cadence = 'quarterly'; addDays = 90; }
    else if (gap >= 330)     { cadence = 'yearly';    addDays = 365; }

    const last = dates[dates.length - 1];
    const next = new Date(last); next.setDate(next.getDate() + addDays);

    const [merchant, amountStr] = key.split('|');
    subs.push({
      merchant,
      amount: Number(amountStr),
      cadence,
      nextDate: next.toISOString().slice(0, 10),
    });
  }
  return subs;
}

/* -------------------- scan route -------------------- */
router.get('/scan/:accountId', async (req, res) => {
  const { accountId } = req.params;
  try {
    const base = process.env.NESSIE_BASE_URL || 'http://api.nessieisreal.com';
    const key  = process.env.NESSIE_KEY;
    const url  = `${base}/accounts/${accountId}/purchases?key=${key}`;

    const { data: purchases = [] } = await axios.get(url).catch(() => ({ data: [] }));

    // 1) build subs FIRST
    let subs = detectSubscriptions(Array.isArray(purchases) ? purchases : []);

    // 2) THEN apply overrides (this is where your error came from)
    const canc = getCancelSet(accountId);
    const snoz = getSnoozeMap(accountId);

    subs = subs
      .filter(s => !canc.has(subKey(s.merchant, s.amount)))
      .map(s => {
        const k = subKey(s.merchant, s.amount);
        const until = snoz.get(k);
        if (until) {
          const current = s.nextDate || '';
          const apply = !current || until > current ? until : current;
          return { ...s, nextDate: apply, snoozedUntil: until };
        }
        return s;
      });

    return res.json(subs);
  } catch (err) {
    console.error('subsense scan error:', err?.response?.status, err?.response?.data || err?.message);
    return res.json([]); // keep demo alive
  }
});
router.post('/reset', (_req, res) => {
  _cancelled.clear();
  _snoozed.clear();
  res.json({ ok: true, message: 'SubSense overrides reset' });
});

export default router;
