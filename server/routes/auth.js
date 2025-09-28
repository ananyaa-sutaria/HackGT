// server/routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const DEMO_PIN   = process.env.DEMO_PIN   || '1234';

// Very simple demo “user store” (email-only). In production: use DB.
function buildUser(email) {
  const name = email.split('@')[0].replace(/[._-]+/g, ' ')
    .split(' ').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
  return { email, name };
}

function sign(user) {
  return jwt.sign({ sub: user.email, user }, JWT_SECRET, { expiresIn: '7d' });
}

function authFromHeader(req, _res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) { req.user = null; return next(); }
  try {
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.user = payload.user;
  } catch {
    req.user = null;
  }
  next();
}

// POST /api/auth/login  -> { token, user }
router.post('/login', (req, res) => {
  const { email, pin } = req.body || {};
  if (!email || !pin) return res.status(400).json({ error: 'email and pin required' });

  // Demo rule: any email works, PIN must match DEMO_PIN
  if (String(pin) !== String(DEMO_PIN)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const user = buildUser(String(email).toLowerCase());
  const token = sign(user);
  return res.json({ ok: true, token, user });
});

// GET /api/auth/me  (reads Authorization: Bearer <token>)
router.get('/me', authFromHeader, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  return res.json({ ok: true, user: req.user });
});

export default router;
