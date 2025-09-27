import express from 'express';
import axios from 'axios';

const router = express.Router();
const base = process.env.NESSIE_BASE_URL;
const key = process.env.NESSIE_KEY;

// Fetch all accounts
router.get('/accounts', async (req, res) => {
  try {
    const response = await axios.get(`${base}/accounts?key=${key}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Fetch transactions for a specific account
router.get('/:accountId', async (req, res) => {
  const { accountId } = req.params;
  try {
    const response = await axios.get(`${base}/accounts/${accountId}/purchases?key=${key}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
