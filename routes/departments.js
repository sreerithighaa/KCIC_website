const pool = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/authenticate');

const ROLE_ADMIN = '1';

async function routes(fastify, options) {

  // GET /api/departments
  fastify.get('/', async (req, reply) => {
    try {
      const result = await pool.query(
        `SELECT d.dept_id, d.dept_name, d.description,
                COUNT(DISTINCT u.user_id) AS member_count,
                COUNT(DISTINCT p.post_id) FILTER (WHERE p.status='approved') AS post_count
         FROM departments d
         LEFT JOIN users u ON u.dept_id = d.dept_id
         LEFT JOIN posts p ON p.dept_id = d.dept_id
         GROUP BY d.dept_id
         ORDER BY d.dept_name`
      );
      return result.rows;
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/departments/:id
  fastify.get('/:id', async (req, reply) => {
    try {
      const dept = await pool.query(
        'SELECT * FROM departments WHERE dept_id=$1', [req.params.id]
      );
      if (!dept.rows[0]) return reply.status(404).send({ error: 'Department not found' });
      const posts = await pool.query(
        `SELECT p.post_id, p.title, p.excerpt, p.created_at, u.name AS author_name
         FROM posts p JOIN users u ON u.user_id = p.author_id
         WHERE p.dept_id=$1 AND p.status='approved'
         ORDER BY p.created_at DESC LIMIT 6`,
        [req.params.id]
      );
      return { ...dept.rows[0], posts: posts.rows };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/departments (admin only)
  fastify.post('/', {
    preHandler: [authenticate, requireRole(ROLE_ADMIN)]
  }, async (req, reply) => {
    const { dept_name, description } = req.body;
    if (!dept_name) return reply.status(400).send({ error: 'dept_name required' });
    try {
      const result = await pool.query(
        'INSERT INTO departments (dept_name, description) VALUES ($1,$2) RETURNING *',
        [dept_name, description || null]
      );
      return reply.status(201).send(result.rows[0]);
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // PUT /api/departments/:id (admin only)
  fastify.put('/:id', {
    preHandler: [authenticate, requireRole(ROLE_ADMIN)]
  }, async (req, reply) => {
    const { dept_name, description } = req.body;
    try {
      const result = await pool.query(
        `UPDATE departments SET dept_name=COALESCE($1,dept_name),
         description=COALESCE($2,description) WHERE dept_id=$3 RETURNING *`,
        [dept_name, description, req.params.id]
      );
      return result.rows[0];
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });
}

module.exports = routes;