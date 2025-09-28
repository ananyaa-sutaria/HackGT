import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import transactionsRouter from './routes/transactions.js';
import subsenseRouter     from './routes/subsense.js';
// If you don't have auth yet, comment the next two lines.
// import authRouter         from './routes/auth.js';

const app = express();

/* CORS & parsers BEFORE routes */
app.use(cors({
  origin: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors());
app.use(express.json());
app.use(morgan('dev'));

/* Health */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* Routes */
app.use('/api/transactions', transactionsRouter);
app.use('/api/subsense',     subsenseRouter);
// app.use('/api/auth',         authRouter);

/* Listen */
const PORT = process.env.PORT || 5050;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  const hostForLog = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Server running on http://${hostForLog}:${PORT}`);
});
