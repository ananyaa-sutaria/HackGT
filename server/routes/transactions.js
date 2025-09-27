import express from 'express';
import axios from 'axios';

const router = express.Router();
const base = process.env.NESSIE_BASE_URL;
const key  = process.env.NESSIE_KEY;

function normAccounts(arr = []) {
  return arr.map(a => ({
    _id: a._id || a.id,
    nickname: a.nickname || a.type || 'Account',
    type: a.type || 'account',
    balance: a.balance ?? a.rewards ?? 0,
  }));
}

/** GET /api/transactions/accounts
 *  Tries global /accounts, falls back to /customers/:id/accounts.
 */
router.get('/accounts', async (_req, res) => {
  if (!base || !key) return res.status(500).json({ error: 'NESSIE env missing' });

  try {
    const r = await axios.get(`${base}/accounts`, { params: { key } });
    const data = Array.isArray(r.data) ? r.data : [];
    if (data.length) return res.json(normAccounts(data));
  } catch (e) {
    // 401/403 is fine; many keys can’t access global accounts
  }

  try {
    const rc = await axios.get(`${base}/customers`, { params: { key } });
    const customers = Array.isArray(rc.data) ? rc.data : [];
    const all = [];
    for (const c of customers) {
      const id = c._id || c.id;
      if (!id) continue;
      try {
        const ra = await axios.get(`${base}/customers/${id}/accounts`, { params: { key } });
        const accs = Array.isArray(ra.data) ? ra.data : [];
        all.push(...accs);
      } catch {}
    }
    return res.json(normAccounts(all));
  } catch (e) {
    const st = e?.response?.status || 500;
    return res.status(st).json({ error: 'Failed to fetch accounts' });
  }
});

export default router;
