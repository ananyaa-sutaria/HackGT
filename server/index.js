import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import os from 'os';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`Server on ${HOST}:${PORT}`));
