// Returns a middleware that allows only the specified role(s).
// Usage: requireRole('super_admin') or requireRole('org_admin', 'super_admin')
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}
