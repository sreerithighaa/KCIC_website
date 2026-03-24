const jwt = require('jsonwebtoken');

/**
 * Fastify preHandler – verifies JWT and attaches user to request.
 * Usage: { preHandler: [authenticate] }
 */
async function authenticate(req, reply) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid token' });
  }
  try {
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return reply.status(401).send({ error: 'Token expired or invalid' });
  }
}

/**
 * Role guard factory.
 * Usage: { preHandler: [authenticate, requireRole('admin')] }
 */
function requireRole(...roles) {
  return async function (req, reply) {
    if (!req.user) return reply.status(401).send({ error: 'Unauthorised' });
    const allowed = roles.map(String);
    if (!allowed.includes(String(req.user.role_id))) {
      return reply.status(403).send({ error: 'Forbidden – insufficient role' });
    }
  };
}

module.exports = { authenticate, requireRole };
