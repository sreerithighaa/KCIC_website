require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const path    = require('path');
const pool    = require('./db/pool');

// ── Plugins ───────────────────────────────────────────────────────────────────
fastify.register(require('@fastify/formbody'));

// Single static registration — serves /css/*, /js/*, /assets/* etc.
fastify.register(require('@fastify/static'), {
  root:   path.join(__dirname, 'public'),
  prefix: '/'
});

fastify.register(require('@fastify/view'), {
  engine: { ejs: require('ejs') },
  root:   path.join(__dirname, 'views'),
  layout: false
});

// ── CORS ──────────────────────────────────────────────────────────────────────
fastify.addHook('onRequest', async (req, reply) => {
  reply.header('Access-Control-Allow-Origin',  '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return reply.status(204).send();
});

// ── API Routes ────────────────────────────────────────────────────────────────
fastify.register(require('./routes/auth'),          { prefix: '/api/auth' });
fastify.register(require('./routes/posts'),         { prefix: '/api/posts' });
fastify.register(require('./routes/announcements'), { prefix: '/api/announcements' });
fastify.register(require('./routes/departments'),   { prefix: '/api/departments' });
fastify.register(require('./routes/dashboard'),     { prefix: '/api/dashboard' });

// ── Page Routes (EJS) ─────────────────────────────────────────────────────────
fastify.get('/',              async (req, reply) => reply.redirect('/home'));
fastify.get('/home', async (req, reply) => reply.view('pages/home.ejs', {
  title:       'Home',
  activePage:  'home',
  description: 'Kings Cornerstone International College — Empowering academic excellence through student blogs, departmental posts, and college announcements.',
  keywords:    'kings cornerstone, KCIC, international college, academic excellence, student blogs, college announcements'
}));

fastify.get('/blogs', async (req, reply) => reply.view('pages/blogs.ejs', {
  title:       'Academic Blogs',
  activePage:  'blogs',
  description: 'Explore approved student and faculty blog posts from Kings Cornerstone International College across all departments.',
  keywords:    'academic blogs, student posts, KCIC blogs, college articles, department blogs, kings cornerstone'
}));

fastify.get('/announcements', async (req, reply) => reply.view('pages/announcements.ejs', {
  title:       'Announcements',
  activePage:  'announcements',
  description: 'Stay up to date with the latest announcements, notices, and updates from Kings Cornerstone International College.',
  keywords:    'KCIC announcements, college notices, kings cornerstone updates, college news, student announcements'
}));

fastify.get('/login', async (req, reply) => reply.view('pages/login.ejs', {
  title:       'Sign In',
  activePage:  '',
  description: 'Sign in to your Kings Cornerstone International College account using your @cornerstone.edu.in email.',
  keywords:    'KCIC login, kings cornerstone sign in, student login, college portal login'
}));

fastify.get('/register', async (req, reply) => reply.view('pages/register.ejs', {
  title:       'Register',
  activePage:  '',
  description: 'Create your Kings Cornerstone International College account and join our academic community.',
  keywords:    'KCIC register, kings cornerstone sign up, student registration, college account'
}));

fastify.get('/dashboard', async (req, reply) => reply.view('pages/dashboard.ejs', {
  title:       'Dashboard',
  activePage:  '',
  description: 'Manage your posts, review submissions, and access your Kings Cornerstone International College dashboard.',
  keywords:    'KCIC dashboard, student dashboard, assessor dashboard, admin panel, kings cornerstone portal'
}));

// Blog single view — SSR post data into EJS
// Approved posts are public; author can also preview their own pending/rejected posts
fastify.get('/blog/:id', async (req, reply) => {
  try {
    // Try to get the JWT token from cookie or Authorization header (optional, for preview)
    let requestUserId = null;
    try {
      const authHeader = req.headers['authorization'];
      const queryToken = req.query.token;
      const rawToken = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || queryToken;
      // We don't enforce auth here — just peek at who's asking if token present
      if (rawToken) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(rawToken, process.env.JWT_SECRET || 'secret');
        requestUserId = decoded.user_id;
      }
    } catch (e) { /* not logged in or invalid token — that's fine */ }

    // Fetch the post regardless of status first
    const result = await pool.query(
      `SELECT p.*, u.name AS author_name, d.dept_name,
              approver.name AS approver_name,
              ARRAY_AGG(t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL) AS tags
       FROM posts p
       JOIN users u        ON u.user_id    = p.author_id
       JOIN departments d  ON d.dept_id    = p.dept_id
       LEFT JOIN users approver ON approver.user_id = p.approved_by
       LEFT JOIN post_tags pt   ON pt.post_id = p.post_id
       LEFT JOIN tags t         ON t.tag_id   = pt.tag_id
       WHERE p.post_id = $1
       GROUP BY p.post_id, u.name, d.dept_name, approver.name`,
      [req.params.id]
    );

    const post = result.rows[0] || null;

    // Only show the post if: it is approved  OR  the viewer is the author
    const canView = post && (
      post.status === 'approved' ||
      (requestUserId && post.author_id === requestUserId)
    );

    return reply.view('pages/blog-view.ejs', {
      title:        canView ? post.title : 'Post Not Found',
      activePage:  'blogs',
      post:        canView ? post : null,
      description: canView ? (post.excerpt || post.content?.substring(0, 155) + '...') : 'This post is unavailable or has not been published yet.',
      keywords: canView ? `${(post.tags || []).join(', ')}, ${post.dept_name}, KCIC blogs, kings cornerstone` : 'kings cornerstone, KCIC'
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.view('pages/blog-view.ejs', { 
      title:       'Error',
      activePage:  'blogs',
      post:        null,
      description: 'An error occurred while loading this post on Kings Cornerstone International College.',
      keywords:    'kings cornerstone, KCIC blogs' });
  }
});

// ── 404 handler ───────────────────────────────────────────────────────────────
fastify.setNotFoundHandler(async (req, reply) => {
  // Only render EJS 404 for page routes, not API
  if (req.url.startsWith('/api')) {
    return reply.status(404).send({ error: 'Route not found' });
  }
  return reply.status(404).view('pages/404.ejs', { title: '404', activePage: '' });
});

// ── Health ────────────────────────────────────────────────────────────────────
fastify.get('/api', async () => ({ message: 'KCIC API v1.0 ✓', version: '1.0.0' }));

// ── Start ─────────────────────────────────────────────────────────────────────
fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`\n🚀  KCIC running at ${address}`);
  console.log(`📖  Home  → ${address}/home`);
  console.log(`🔑  Login → ${address}/login\n`);
});
