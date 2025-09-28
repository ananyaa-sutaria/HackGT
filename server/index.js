import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import transactionsRouter from './routes/transactions.js';
import subsenseRouter     from './routes/subsense.js';
import authRouter from './routes/auth.js'; // only if you have it

const app = express();

app.set('etag', false); // disable automatic ETags globally
app.use((req, res, next) => {
  // no caching for API responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

app.use(cors({
  origin: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/transactions', transactionsRouter);
app.use('/api/subsense',     subsenseRouter);
app.use('/api/auth',         authRouter);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  const hostForLog = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Server running on http://${hostForLog}:${PORT}`);
});
