// server/routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const SECRET   = process.env.JWT_SECRET || 'dev-secret';
const DEMO_PIN = process.env.DEMO_PIN   || '4242';

function sign(sub, extra = {}) {
  return jwt.sign({ sub, ...extra }, SECRET, { expiresIn: '7d' });
}

// POST /api/auth/login  { email, pin }
router.post('/login', (req, res) => {
  const { email, pin } = req.body || {};
  if (!email || !pin) return res.status(400).json({ error: 'email and pin required' });
  if (String(pin) !== String(DEMO_PIN)) return res.status(401).json({ error: 'invalid credentials' });

  const token = sign(String(email).toLowerCase(), { role: 'demo' });
  res.json({ token, user: { email } });
});

// GET /api/auth/me  (Bearer token)
router.get('/me', (req, res) => {
  try {
    const hdr = req.headers.authorization || '';
    const [, tok] = hdr.split(' ');
    const payload = jwt.verify(tok, SECRET);
    res.json({ ok: true, user: { email: payload.sub, role: payload.role || 'demo' } });
  } catch {
    res.status(401).json({ ok: false });
  }
});

export default router;
