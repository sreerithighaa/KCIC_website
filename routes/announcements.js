const pool = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/authenticate');

const ROLE_ADMIN = '1';

async function routes(fastify, options) {

  // GET /api/announcements — public
  fastify.get('/', async (req, reply) => {
    const { category, search, page = 1, limit = 9 } = req.query;
    const params = [];
    let where = 'WHERE a.is_published = TRUE';

    if (category) {
      params.push(category);
      where += ' AND a.category=$' + params.length;
    }
    if (search) {
      params.push('%' + search + '%');
      const idx1 = params.length;
      params.push('%' + search + '%');
      const idx2 = params.length;
      where += ' AND (a.title ILIKE $' + idx1 + ' OR a.content ILIKE $' + idx2 + ')';
    }

    try {
      const result = await pool.query(
        'SELECT a.ann_id, a.title, a.content, a.category, a.created_at, u.name AS author_name ' +
        'FROM announcements a JOIN users u ON u.user_id = a.author_id ' +
        where + ' ORDER BY a.created_at DESC ' +
        'LIMIT $' + (params.length+1) + ' OFFSET $' + (params.length+2),
        [...params, limit, (page-1)*limit]
      );
      const total = await pool.query('SELECT COUNT(*) FROM announcements a ' + where, params);
      return { announcements: result.rows, total: parseInt(total.rows[0].count) };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/announcements — ADMIN ONLY
  fastify.post('/', {
    preHandler: [authenticate, requireRole(ROLE_ADMIN)]
  }, async (req, reply) => {
    const { title, content, category } = req.body;
    if (!title || !content) return reply.status(400).send({ error: 'title and content required' });
    try {
      const result = await pool.query(
        'INSERT INTO announcements (title, content, category, author_id) VALUES ($1,$2,$3,$4) RETURNING *',
        [title, content, category || 'general', req.user.user_id]
      );
      return reply.status(201).send(result.rows[0]);
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // DELETE /api/announcements/:id — ADMIN ONLY
  fastify.delete('/:id', {
    preHandler: [authenticate, requireRole(ROLE_ADMIN)]
  }, async (req, reply) => {
    try {
      await pool.query('DELETE FROM announcements WHERE ann_id=$1', [req.params.id]);
      return { message: 'Deleted' };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });
}

module.exports = routes;
