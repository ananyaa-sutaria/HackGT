import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import subsenseRouter from './routes/subsense.js';
import transactionsRouter from './routes/transactions.js';
import demoRouter from './routes/demo.js';
// …




const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Mount Nessie-backed routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/subsense', subsenseRouter);
app.use('/api/demo', demoRouter);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () =>
  console.log(`🚀 Server on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`)
);
