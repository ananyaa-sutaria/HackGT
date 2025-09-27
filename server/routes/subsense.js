import express from 'express';
import axios from 'axios';
import { detectRecurring } from '../services/recurrence.js';

const router = express.Router();
const base = process.env.NESSIE_BASE_URL;
const key = process.env.NESSIE_KEY;

// Detect subscriptions
router.get('/scan/:accountId', async (req, res) => {
  const { accountId } = req.params;
  try {
    const response = await axios.get(`${base}/accounts/${accountId}/purchases?key=${key}`);
    const subscriptions = detectRecurring(response.data);
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to scan subscriptions' });
  }
});

// Simulate cancel by moving money to savings
router.post('/simulate-cancel', async (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body;
  try {
    const result = await axios.post(`${base}/accounts/${fromAccountId}/transfers?key=${key}`, {
      medium: 'balance',
      payee_id: toAccountId,
      amount: amount,
      transaction_date: new Date().toISOString().slice(0, 10),
      description: 'SubSense simulated savings transfer'
    });
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to simulate cancellation' });
  }
});

export default router;
