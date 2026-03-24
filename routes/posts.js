const pool = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/authenticate');

// role_id constants (match seed data: admin=1, assessor=2, student=3)
const ROLE_ADMIN    = '1';
const ROLE_ASSESSOR = '2';
const ROLE_STUDENT  = '3';

async function routes(fastify, options) {

  // ── NAMED ROUTES FIRST – must come before /:id wildcard ─────────────

  // GET /api/posts/my/posts – student's own posts
  fastify.get('/my/posts', { preHandler: [authenticate] }, async (req, reply) => {
    try {
      const result = await pool.query(
        `SELECT p.post_id, p.title, p.status, p.created_at, p.excerpt,
                d.dept_name,
                ARRAY_AGG(t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL) AS tags
         FROM posts p
         JOIN departments d ON d.dept_id = p.dept_id
         LEFT JOIN post_tags pt ON pt.post_id = p.post_id
         LEFT JOIN tags t ON t.tag_id = pt.tag_id
         WHERE p.author_id = $1
         GROUP BY p.post_id, d.dept_name
         ORDER BY p.created_at DESC`,
        [req.user.user_id]
      );
      return result.rows;
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/posts/pending/all – awaiting approval (assessor/admin)
  fastify.get('/pending/all', {
    preHandler: [authenticate, requireRole(ROLE_ASSESSOR, ROLE_ADMIN)]
  }, async (req, reply) => {
    try {
      const result = await pool.query(
        `SELECT p.post_id, p.title, p.excerpt, p.created_at,
                u.name AS author_name, d.dept_name
         FROM posts p
         JOIN users u ON u.user_id = p.author_id
         JOIN departments d ON d.dept_id = p.dept_id
         WHERE p.status = 'pending'
         ORDER BY p.created_at ASC`
      );
      return result.rows;
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/posts/all/admin – all posts for admin
  fastify.get('/all/admin', {
    preHandler: [authenticate, requireRole(ROLE_ADMIN, ROLE_ASSESSOR)]
  }, async (req, reply) => {
    const { status, dept_id, page = 1, limit = 20 } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (status)  { params.push(status);  where += ` AND p.status=$${params.length}`; }
    if (dept_id) { params.push(dept_id); where += ` AND p.dept_id=$${params.length}`; }
    try {
      const result = await pool.query(
        `SELECT p.post_id, p.title, p.status, p.created_at,
                u.name AS author_name, d.dept_name
         FROM posts p
         JOIN users u ON u.user_id = p.author_id
         JOIN departments d ON d.dept_id = p.dept_id
         ${where}
         ORDER BY p.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, (page - 1) * limit]
      );
      return result.rows;
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ── PUBLIC ──────────────────────────────────────────────────────────

  // GET /api/posts  – approved posts, with search & filter
  fastify.get('/', async (req, reply) => {
    const { dept_id, author, tag, search, date, page = 1, limit = 9 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = `WHERE p.status = 'approved'`;

    if (dept_id) { params.push(dept_id);      where += ` AND p.dept_id = $${params.length}`; }
    if (author)  { params.push(`%${author}%`); where += ` AND u.name ILIKE $${params.length}`; }
    if (search)  {
      params.push(`%${search}%`); params.push(`%${search}%`);
      where += ` AND (p.title ILIKE $${params.length - 1} OR p.content ILIKE $${params.length})`;
    }
    if (date)    { params.push(date);          where += ` AND p.created_at::date >= $${params.length}`; }

    try {
      const result = await pool.query(
        `SELECT p.post_id, p.title, p.excerpt, p.cover_url, p.created_at,
                u.name AS author_name, d.dept_name,
                ARRAY_AGG(t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL) AS tags
         FROM posts p
         JOIN users u ON u.user_id = p.author_id
         JOIN departments d ON d.dept_id = p.dept_id
         LEFT JOIN post_tags pt ON pt.post_id = p.post_id
         LEFT JOIN tags t ON t.tag_id = pt.tag_id
         ${where}
         GROUP BY p.post_id, u.name, d.dept_name
         ORDER BY p.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const total = await pool.query(
        `SELECT COUNT(*) FROM posts p JOIN users u ON u.user_id = p.author_id ${where}`,
        params
      );

      return { posts: result.rows, total: parseInt(total.rows[0].count), page: +page, limit: +limit };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/posts/:id/preview – author or assessor/admin can read any post regardless of status
  fastify.get('/:id/preview', { preHandler: [authenticate] }, async (req, reply) => {
    try {
      const result = await pool.query(
        `SELECT p.*, u.name AS author_name, d.dept_name,
                approver.name AS approver_name,
                ARRAY_AGG(t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL) AS tags
         FROM posts p
         JOIN users u ON u.user_id = p.author_id
         JOIN departments d ON d.dept_id = p.dept_id
         LEFT JOIN users approver ON approver.user_id = p.approved_by
         LEFT JOIN post_tags pt ON pt.post_id = p.post_id
         LEFT JOIN tags t ON t.tag_id = pt.tag_id
         WHERE p.post_id = $1
         GROUP BY p.post_id, u.name, d.dept_name, approver.name`,
        [req.params.id]
      );
      const post = result.rows[0];
      if (!post) return reply.status(404).send({ error: 'Post not found' });
      const isAuthor     = post.author_id === req.user.user_id;
      const isPrivileged = String(req.user.role_id) === '1' || String(req.user.role_id) === '2';
      if (!isAuthor && !isPrivileged) {
        return reply.status(403).send({ error: 'Not authorised to preview this post' });
      }
      return post;
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/posts/:id  – single post (public, approved only)
  fastify.get('/:id', async (req, reply) => {
    try {
      const result = await pool.query(
        `SELECT p.*, u.name AS author_name, d.dept_name,
                approver.name AS approver_name,
                ARRAY_AGG(t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL) AS tags
         FROM posts p
         JOIN users u ON u.user_id = p.author_id
         JOIN departments d ON d.dept_id = p.dept_id
         LEFT JOIN users approver ON approver.user_id = p.approved_by
         LEFT JOIN post_tags pt ON pt.post_id = p.post_id
         LEFT JOIN tags t ON t.tag_id = pt.tag_id
         WHERE p.post_id = $1 AND p.status = 'approved'
         GROUP BY p.post_id, u.name, d.dept_name, approver.name`,
        [req.params.id]
      );
      if (!result.rows[0]) return reply.status(404).send({ error: 'Post not found' });
      return result.rows[0];
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ── STUDENT ─────────────────────────────────────────────────────────

  // POST /api/posts  – create post (student)
  fastify.post('/', {
    preHandler: [authenticate, requireRole(ROLE_STUDENT, ROLE_ADMIN)]
  }, async (req, reply) => {
    const { title, content, excerpt, cover_url, dept_id, tags } = req.body;
    if (!title || !content || !dept_id) {
      return reply.status(400).send({ error: 'title, content, dept_id required' });
    }
    try {
      const post = await pool.query(
        `INSERT INTO posts (title, content, excerpt, cover_url, author_id, dept_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [title, content, excerpt || content.substring(0, 160), cover_url || null, req.user.user_id, dept_id]
      );
      const postId = post.rows[0].post_id;

      if (tags && tags.length) {
        for (const tagName of tags) {
          const tag = await pool.query(
            `INSERT INTO tags (tag_name) VALUES ($1) ON CONFLICT (tag_name) DO UPDATE SET tag_name=EXCLUDED.tag_name RETURNING tag_id`,
            [tagName]
          );
          await pool.query('INSERT INTO post_tags (post_id,tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [postId, tag.rows[0].tag_id]);
        }
      }

      return reply.status(201).send(post.rows[0]);
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // PUT /api/posts/:id – edit own pending post
  fastify.put('/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { title, content, excerpt, cover_url, dept_id } = req.body;
    try {
      const check = await pool.query(
        'SELECT author_id, status FROM posts WHERE post_id=$1', [req.params.id]
      );
      if (!check.rows[0]) return reply.status(404).send({ error: 'Post not found' });
      if (check.rows[0].author_id !== req.user.user_id && String(req.user.role_id) !== ROLE_ADMIN) {
        return reply.status(403).send({ error: 'Not your post' });
      }
      if (check.rows[0].status === 'approved') {
        return reply.status(400).send({ error: 'Approved posts cannot be edited' });
      }
      const result = await pool.query(
        `UPDATE posts SET title=COALESCE($1,title), content=COALESCE($2,content),
         excerpt=COALESCE($3,excerpt), cover_url=COALESCE($4,cover_url),
         dept_id=COALESCE($5,dept_id), updated_at=NOW()
         WHERE post_id=$6 RETURNING *`,
        [title, content, excerpt, cover_url, dept_id, req.params.id]
      );
      return result.rows[0];
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // PUT /api/posts/:id/approve
  fastify.put('/:id/approve', {
    preHandler: [authenticate, requireRole(ROLE_ASSESSOR, ROLE_ADMIN)]
  }, async (req, reply) => {
    try {
      const result = await pool.query(
        `UPDATE posts SET status='approved', approved_by=$1, approved_at=NOW()
         WHERE post_id=$2 RETURNING post_id, status`,
        [req.user.user_id, req.params.id]
      );
      if (!result.rows[0]) return reply.status(404).send({ error: 'Post not found' });
      return { message: 'Post approved', post: result.rows[0] };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // PUT /api/posts/:id/reject
  fastify.put('/:id/reject', {
    preHandler: [authenticate, requireRole(ROLE_ASSESSOR, ROLE_ADMIN)]
  }, async (req, reply) => {
    try {
      await pool.query(`UPDATE posts SET status='rejected' WHERE post_id=$1`, [req.params.id]);
      return { message: 'Post rejected' };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // DELETE /api/posts/:id
  fastify.delete('/:id', { preHandler: [authenticate] }, async (req, reply) => {
    try {
      const check = await pool.query(
        'SELECT author_id FROM posts WHERE post_id=$1', [req.params.id]
      );
      if (!check.rows[0]) return reply.status(404).send({ error: 'Post not found' });
      const isAuthor = check.rows[0].author_id === req.user.user_id;
      const isAdminOrAssessor = String(req.user.role_id) === ROLE_ADMIN || String(req.user.role_id) === ROLE_ASSESSOR;
      if (!isAuthor && !isAdminOrAssessor) {
        return reply.status(403).send({ error: 'Not authorised' });
      }
      await pool.query('DELETE FROM posts WHERE post_id=$1', [req.params.id]);
      return { message: 'Post deleted' };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });
}

module.exports = routes;