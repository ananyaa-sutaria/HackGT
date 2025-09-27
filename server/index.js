import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import transactionsRouter from './routes/transactions.js';
import subsenseRouter from './routes/subsense.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/subsense', subsenseRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
