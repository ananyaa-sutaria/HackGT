import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// LOG EVERY REQUEST (helps a ton)
app.use((req,res,next)=>{ console.log(req.method, req.url); next(); });

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// TEMP MOCK: accounts (so the app can load even if Nessie isn't wired yet)
app.get('/api/transactions/accounts', (_req, res) => {
  res.json([
    { _id: 'acc_1', nickname: 'Checking', balance: 1234.56, type: 'checking' },
    { _id: 'acc_2', nickname: 'Savings',  balance: 9876.54, type: 'savings'  },
  ]);
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`🚀 Server on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`));
