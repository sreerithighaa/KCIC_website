const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pool');
const { authenticate } = require('../middleware/authenticate');

async function routes(fastify, options) {

  // POST /api/auth/register
  fastify.post('/register', async (req, reply) => {
    const { name, email, password, role_id, dept_id } = req.body;

    if (!name || !email || !password || !role_id) {
      return reply.status(400).send({ error: 'name, email, password and role_id are required' });
    }
    if (!email.endsWith('@cornerstone.edu.in')) {
      return reply.status(400).send({ error: 'Only @cornerstone.edu.in email addresses are allowed' });
    }

    try {
      const exists = await pool.query('SELECT user_id FROM users WHERE email=$1', [email]);
      if (exists.rows.length) return reply.status(409).send({ error: 'Email already registered' });

      const hashed = await bcrypt.hash(password, 12);
      const result = await pool.query(
        `INSERT INTO users (name, email, pwd, role_id, dept_id)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING user_id, name, email, role_id, dept_id, created_at`,
        [name, email, hashed, role_id, dept_id || null]
      );

      return reply.status(201).send({ user: result.rows[0] });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Registration failed' });
    }
  });

  // POST /api/auth/login
  fastify.post('/login', async (req, reply) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password are required' });
    }

    try {
      const result = await pool.query(
        `SELECT u.*, r.role_name, d.dept_name
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         LEFT JOIN departments d ON d.dept_id = u.dept_id
         WHERE u.email = $1`,
        [email]
      );
      const user = result.rows[0];
      if (!user) return reply.status(401).send({ error: 'Invalid email or password' });
      if (!user.is_active) return reply.status(403).send({ error: 'Account is disabled' });

      const valid = await bcrypt.compare(password, user.pwd);
      if (!valid) return reply.status(401).send({ error: 'Invalid email or password' });

      const token = jwt.sign(
        { user_id: user.user_id, role_id: user.role_id, role_name: user.role_name, dept_id: user.dept_id },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      return {
        token,
        user: {
          user_id:   user.user_id,
          name:      user.name,
          email:     user.email,
          role_id:   user.role_id,
          role_name: user.role_name,
          dept_id:   user.dept_id,
          dept_name: user.dept_name
        }
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  // GET /api/auth/me  (protected)
  fastify.get('/me', { preHandler: [authenticate] }, async (req, reply) => {
    try {
      const result = await pool.query(
        `SELECT u.user_id, u.name, u.email, u.created_at,
                r.role_id, r.role_name, d.dept_id, d.dept_name
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         LEFT JOIN departments d ON d.dept_id = u.dept_id
         WHERE u.user_id = $1`,
        [req.user.user_id]
      );
      if (!result.rows[0]) return reply.status(404).send({ error: 'User not found' });
      return result.rows[0];
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });
}

module.exports = routes;