// server/routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const DEMO_PIN   = process.env.DEMO_PIN   || '1234';

const nameFromEmail = (email) =>
  email.split('@')[0].replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

router.post('/login', (req, res) => {
  const { email, pin } = req.body || {};
  if (!email || !pin) return res.status(400).json({ error: 'email and pin required' });
  if (String(pin) !== String(DEMO_PIN)) return res.status(401).json({ error: 'invalid credentials' });

  const user  = { email: String(email).toLowerCase(), name: nameFromEmail(email) };
  const token = jwt.sign({ sub: user.email, user }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok: true, token, user });
});

router.get('/me', (req, res) => {
  const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(m[1], JWT_SECRET);
    return res.json({ ok: true, user: payload.user });
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
});

export default router;
