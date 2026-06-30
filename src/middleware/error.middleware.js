// Catches anything passed to next(err) and returns a clean JSON response.
// Must be registered LAST in app.js (Express identifies error handlers by 4 args).
export function errorHandler(err, _req, res, _next) {
  console.error(err);

  // Mongoose duplicate-key error (code 11000) → 409 Conflict
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] ?? 'field';
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // Mongoose validation error → 400 Bad Request
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join('; ') });
  }

  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}
