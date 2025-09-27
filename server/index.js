import 'dotenv/config';
import express from 'express';
import cors from 'cors';
// optional logging
import morgan from 'morgan';

import transactionsRouter from './routes/transactions.js';
import subsenseRouter     from './routes/subsense.js';
import authRouter         from './routes/auth.js';    // 👈 add this

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan?.('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/transactions', transactionsRouter);
app.use('/api/subsense',     subsenseRouter);
app.use('/api/auth',         authRouter);            // 👈 mount here

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  const hostForLog = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Server running on http://${hostForLog}:${PORT}`);
});
