import { verifyToken } from '../utils/token.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    // Catches both TokenExpiredError and JsonWebTokenError
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
