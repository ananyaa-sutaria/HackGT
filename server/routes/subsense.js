import express from 'express';
import axios from 'axios';

const router = express.Router();
const base = process.env.NESSIE_BASE_URL;
const key  = process.env.NESSIE_KEY;

// Helpers
function toISO(d) { return new Date(d).toISOString().slice(0,10); }
function daysBetween(a, b) { return Math.round((new Date(b)-new Date(a))/86400000); }
function mean(arr) { return arr.reduce((s,x)=>s+x,0)/Math.max(arr.length,1); }

function detectSubscriptions(purchases = []) {
  // cluster by (merchant description upper + amount)
  const map = new Map();
  for (const p of purchases) {
    const m = String(p.description || p.merchant || '').toUpperCase().trim();
    const amt = Number(p.amount || 0);
    if (!m || !amt) continue;
    const k = `${m}|${amt.toFixed(2)}`;
    const arr = map.get(k) || [];
    arr.push(new Date(p.purchase_date || p.purchaseDate || p.date));
    map.set(k, arr);
  }

  const out = [];
  for (const [k, dates] of map.entries()) {
    if (dates.length < 3) continue; // need a few points
    dates.sort((a,b)=>a-b);
    const diffs = [];
    for (let i=1;i<dates.length;i++) diffs.push(daysBetween(dates[i-1], dates[i]));
    const avg = mean(diffs);

    // monthly if ~27..33 days (lenient window)
    if (avg >= 27 && avg <= 33) {
      const [merchant, amtStr] = k.split('|');
      const last = dates[dates.length-1];
      const next = new Date(last); next.setDate(next.getDate() + Math.round(avg));
      out.push({
        merchant,
        amount: Number(amtStr),
        cadence: 'monthly',
        nextDate: toISO(next),
      });
    }
  }
  return out;
}

/** GET /api/subsense/scan/:accountId
 *  Pulls purchases from Nessie and infers monthly subscriptions.
 */
router.get('/scan/:accountId', async (req, res) => {
  const { accountId } = req.params;
  if (!base || !key) return res.status(500).json({ error: 'NESSIE env missing' });
  try {
    const r = await axios.get(`${base}/accounts/${encodeURIComponent(accountId)}/purchases`, { params: { key } });
    const purchases = Array.isArray(r.data) ? r.data : [];
    const subs = detectSubscriptions(purchases);
    res.json(subs);
  } catch (e) {
    const st = e?.response?.status || 500;
    const msg = e?.response?.data || e.message;
    res.status(st).json({ error: 'Scan failed', detail: msg });
  }
});

export default router;
