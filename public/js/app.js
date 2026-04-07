import { SitemapStream, streamToPromise } from 'sitemap'
import { createGzip } from 'zlib'

fastify.get('/sitemap.xml', async (req, reply) => {
  const smStream = new SitemapStream({ 
    hostname: 'https://kcic-website-2.onrender.com' 
  })
  const pipeline = smStream.pipe(createGzip())

  smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 })
  smStream.write({ url: '/announcements', changefreq: 'daily', priority: 0.9 })
  smStream.write({ url: '/blogs', changefreq: 'daily', priority: 0.9 })
  smStream.write({ url: '/blog-view', changefreq: 'weekly', priority: 0.7 })
  smStream.write({ url: '/login', changefreq: 'monthly', priority: 0.5 })
  smStream.write({ url: '/register', changefreq: 'monthly', priority: 0.5 })

  smStream.end()

  reply
    .header('Content-Type', 'application/xml')
    .header('Content-Encoding', 'gzip')
    .send(pipeline)
});

const API = '/api';

const Auth = {
  token:      () => localStorage.getItem('kcic_token'),
  user:       () => JSON.parse(localStorage.getItem('kcic_user') || 'null'),
  isLoggedIn: () => !!localStorage.getItem('kcic_token'),
  save:       (token, user) => {
    localStorage.setItem('kcic_token', token);
    localStorage.setItem('kcic_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('kcic_token');
    localStorage.removeItem('kcic_user');
  }
};

function api(path, opts) {
  opts = opts || {};
  var isBody = opts.method && ['POST','PUT','PATCH'].indexOf(opts.method.toUpperCase()) > -1;
  var headers = {};
  if (isBody) headers['Content-Type'] = 'application/json';
  var token = Auth.token();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (opts.headers) {
    Object.keys(opts.headers).forEach(function(k) { headers[k] = opts.headers[k]; });
  }
  return fetch(API + path, {
    method: opts.method || 'GET',
    headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : (isBody ? '{}' : undefined)
  }).then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) throw { status: res.status, message: data.error || 'Request failed' };
      return data;
    });
  });
}

function toast(msg, type, duration) {
  type = type || 'default';
  duration = duration || 3500;
  var container = document.getElementById('toast-container');
  if (!container) return;
  var el = document.createElement('div');
  var colour = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-dark';
  el.className = 'toast align-items-center text-white ' + colour + ' border-0 show';
  el.setAttribute('role', 'alert');
  el.innerHTML = '<div class="d-flex"><div class="toast-body">' + msg + '</div>' +
    '<button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest(\'.toast\').remove()"></button></div>';
  container.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, duration);
}

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function updateNavAuth() {
  var loginPill   = document.getElementById('nav-login-pill');
  var registerBtn = document.getElementById('nav-register');
  var dashLink    = document.getElementById('nav-dash');
  var logoutBtn   = document.getElementById('nav-logout');

  if (Auth.isLoggedIn()) {
    if (loginPill)   loginPill.classList.add('d-none');
    if (registerBtn) registerBtn.classList.add('d-none');
    if (dashLink)    dashLink.classList.remove('d-none');
    if (logoutBtn)   logoutBtn.classList.remove('d-none');
  } else {
    if (loginPill)   loginPill.classList.remove('d-none');
    if (registerBtn) registerBtn.classList.remove('d-none');
    if (dashLink)    dashLink.classList.add('d-none');
    if (logoutBtn)   logoutBtn.classList.add('d-none');
  }
}

var logoutBtn = document.getElementById('nav-logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', function() {
    Auth.clear();
    toast('Logged out');
    setTimeout(function() { location.href = '/home'; }, 500);
  });
}

updateNavAuth();