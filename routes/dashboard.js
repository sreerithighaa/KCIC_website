const pool = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/authenticate');

const ROLE_ADMIN    = '1';
const ROLE_ASSESSOR = '2';
const ROLE_STUDENT  = '3';

async function routes(fastify, options) {

  // ── SHARED ───────────────────────────────────────────────────────────

  // GET /api/dashboard  – returns role-aware dashboard data
  fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
    const { user_id, role_id } = req.user;
    try {
      const access = await pool.query(
        'SELECT * FROM dashboard_access WHERE role_id=$1', [role_id]
      );
      return { role_id, permissions: access.rows[0] || {} };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ── STUDENT DASHBOARD ────────────────────────────────────────────────

  // GET /api/dashboard/student
  fastify.get('/student', {
    preHandler: [authenticate, requireRole(ROLE_STUDENT, ROLE_ADMIN)]
  }, async (req, reply) => {
    const uid = req.user.user_id;
    try {
      const [myPosts, stats] = await Promise.all([
        pool.query(
          `SELECT p.post_id, p.title, p.status, p.created_at, d.dept_name
           FROM posts p JOIN departments d ON d.dept_id=p.dept_id
           WHERE p.author_id=$1 ORDER BY p.created_at DESC LIMIT 10`,
          [uid]
        ),
        pool.query(
          `SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status='approved') AS approved,
             COUNT(*) FILTER (WHERE status='pending')  AS pending,
             COUNT(*) FILTER (WHERE status='rejected') AS rejected
           FROM posts WHERE author_id=$1`,
          [uid]
        )
      ]);
      return { posts: myPosts.rows, stats: stats.rows[0] };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ── ASSESSOR DASHBOARD ───────────────────────────────────────────────

  // GET /api/dashboard/assessor
  fastify.get('/assessor', {
    preHandler: [authenticate, requireRole(ROLE_ASSESSOR, ROLE_ADMIN)]
  }, async (req, reply) => {
    try {
      const [pending, stats, recent] = await Promise.all([
        pool.query(
          `SELECT p.post_id, p.title, p.created_at,
                  u.name AS author_name, d.dept_name
           FROM posts p
           JOIN users u ON u.user_id=p.author_id
           JOIN departments d ON d.dept_id=p.dept_id
           WHERE p.status='pending' ORDER BY p.created_at ASC`
        ),
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE status='pending')  AS pending,
             COUNT(*) FILTER (WHERE status='approved') AS approved,
             COUNT(*) FILTER (WHERE status='rejected') AS rejected
           FROM posts`
        ),
        pool.query(
          `SELECT p.post_id, p.title, p.status, p.approved_at, u.name AS author_name
           FROM posts p JOIN users u ON u.user_id=p.author_id
           WHERE p.approved_by=$1 ORDER BY p.approved_at DESC LIMIT 5`,
          [req.user.user_id]
        )
      ]);
      return {
        pending_posts: pending.rows,
        stats: stats.rows[0],
        recently_reviewed: recent.rows
      };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ── ADMIN DASHBOARD ──────────────────────────────────────────────────

  // GET /api/dashboard/admin/stats
  fastify.get('/admin/stats', {
    preHandler: [authenticate, requireRole(ROLE_ADMIN)]
  }, async (req, reply) => {
    try {
      const [users, posts, anns, depts] = await Promise.all([
        pool.query(`SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE role_id=3) AS students,
                    COUNT(*) FILTER (WHERE role_id=2) AS assessors
                    FROM users WHERE is_active=TRUE`),
        pool.query(`SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status='pending')  AS pending,
                    COUNT(*) FILTER (WHERE status='approved') AS approved,
                    COUNT(*) FILTER (WHERE status='rejected') AS rejected
                    FROM posts`),
        pool.query(`SELECT COUNT(*) AS total FROM announcements WHERE is_published=TRUE`),
        pool.query(`SELECT COUNT(*) AS total FROM departments`)
      ]);
      return {
        users: users.rows[0],
        posts: posts.rows[0],
        announcements: anns.rows[0],
        departments: depts.rows[0]
      };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/dashboard/admin/users
  // 4-TABLE JOIN: users → roles → departments → posts
  fastify.get('/admin/users', {
    preHandler: [authenticate, requireRole(ROLE_ADMIN)]
  }, async (req, reply) => {
    const { role_id, dept_id, search, page = 1, limit = 20 } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (role_id) { params.push(role_id); where += ` AND u.role_id=$${params.length}`; }
    if (dept_id) { params.push(dept_id); where += ` AND u.dept_id=$${params.length}`; }
    if (search)  {
      params.push('%' + search + '%');
      const i = params.length;
      params.push('%' + search + '%');
      const j = params.length;
      where += ` AND (u.name ILIKE $${i} OR u.email ILIKE $${j})`;
    }

    try {
      /*
       * 4-TABLE JOIN
       * Table 1: users       — registered user accounts
       * Table 2: roles       — role of each user (admin/assessor/student)
       * Table 3: departments — department each user belongs to
       * Table 4: posts       — blog posts written by each user
       *
       * users JOIN roles            ON roles.role_id       = users.role_id
       * users LEFT JOIN departments ON departments.dept_id = users.dept_id
       * users LEFT JOIN posts       ON posts.author_id     = users.user_id
       */
      const result = await pool.query(
        `SELECT
           u.user_id,
           u.name,
           u.email,
           u.is_active,
           u.created_at,
           r.role_name,
           d.dept_name,
           COUNT(p.post_id)                                     AS post_count,
           COUNT(p.post_id) FILTER (WHERE p.status='approved')  AS approved_count,
           COUNT(p.post_id) FILTER (WHERE p.status='pending')   AS pending_count
         FROM users u
         JOIN      roles       r  ON r.role_id  = u.role_id
         LEFT JOIN departments d  ON d.dept_id  = u.dept_id
         LEFT JOIN posts       p  ON p.author_id = u.user_id
         ${where}
         GROUP BY u.user_id, r.role_name, d.dept_name
         ORDER BY u.created_at DESC
         LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, limit, (page-1)*limit]
      );
      return result.rows;
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // PUT /api/dashboard/admin/users/:id/toggle  – enable/disable user
  fastify.put('/admin/users/:id/toggle', {
    preHandler: [authenticate, requireRole(ROLE_ADMIN)]
  }, async (req, reply) => {
    try {
      const result = await pool.query(
        'UPDATE users SET is_active = NOT is_active WHERE user_id=$1 RETURNING user_id, is_active',
        [req.params.id]
      );
      return result.rows[0];
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // DELETE /api/dashboard/admin/users/:id
  fastify.delete('/admin/users/:id', {
    preHandler: [authenticate, requireRole(ROLE_ADMIN)]
  }, async (req, reply) => {
    try {
      await pool.query('DELETE FROM users WHERE user_id=$1', [req.params.id]);
      return { message: 'User deleted' };
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });
}

module.exports = routes;