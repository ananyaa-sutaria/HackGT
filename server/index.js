import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import subsenseRouter from './routes/subsense.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health (for quick testing)
app.get('/health', (_req, res) => res.json({ ok: true }));

// (Optional) mock accounts so your Accounts tab has data
app.get('/api/transactions/accounts', (_req, res) => {
  res.json([
    { _id: 'acc_1', nickname: 'Checking', balance: 1234.56, type: 'checking' },
    { _id: 'acc_2', nickname: 'Savings',  balance: 9876.54, type: 'savings'  },
  ]);
});

// MOUNT HERE
app.use('/api/subsense', subsenseRouter);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
