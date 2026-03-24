-- ============================================================
-- KCIC Academic Website - Full Database Schema
-- Normalised to 3NF
-- ============================================================

-- ROLES
CREATE TABLE IF NOT EXISTS roles (
  role_id   SERIAL PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL  -- admin, assessor, student, public
);

-- DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  dept_id     SERIAL PRIMARY KEY,
  dept_name   VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- USERS
CREATE TABLE IF NOT EXISTS users (
  user_id    SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) UNIQUE NOT NULL,
  pwd        TEXT NOT NULL,
  role_id    INT NOT NULL REFERENCES roles(role_id),
  dept_id    INT REFERENCES departments(dept_id),
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- POSTS (Academic Blogs)
CREATE TABLE IF NOT EXISTS posts (
  post_id     SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  excerpt     TEXT,
  cover_url   TEXT,
  author_id   INT NOT NULL REFERENCES users(user_id),
  dept_id     INT NOT NULL REFERENCES departments(dept_id),
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by INT REFERENCES users(user_id),
  approved_at TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- POST TAGS
CREATE TABLE IF NOT EXISTS tags (
  tag_id   SERIAL PRIMARY KEY,
  tag_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
  tag_id  INT REFERENCES tags(tag_id)   ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  ann_id      SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  cover_url   TEXT,
  author_id   INT NOT NULL REFERENCES users(user_id),
  category    VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general','academic','event','urgent')),
  is_published BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- DASHBOARD ACCESS CONFIG
CREATE TABLE IF NOT EXISTS dashboard_access (
  access_id        SERIAL PRIMARY KEY,
  role_id          INT UNIQUE REFERENCES roles(role_id),
  can_post         BOOLEAN DEFAULT FALSE,
  can_approve      BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  can_announce     BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO roles (role_name) VALUES
  ('admin'), ('assessor'), ('student'), ('public')
ON CONFLICT DO NOTHING;

INSERT INTO departments (dept_name, description) VALUES
  ('Computing',      'Covers software engineering, programming, and IT systems.'),
  ('Business',       'Covers business management, finance, and entrepreneurship.'),
  ('Engineering',    'Covers mechanical, electrical, and civil engineering.'),
  ('Applied Science','Covers biology, chemistry, physics and applied sciences.')
ON CONFLICT DO NOTHING;

INSERT INTO dashboard_access (role_id, can_post, can_approve, can_manage_users, can_announce)
  SELECT role_id, FALSE, FALSE, TRUE, TRUE  FROM roles WHERE role_name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO dashboard_access (role_id, can_post, can_approve, can_manage_users, can_announce)
  SELECT role_id, FALSE, TRUE, FALSE, FALSE FROM roles WHERE role_name = 'assessor'
ON CONFLICT DO NOTHING;

INSERT INTO dashboard_access (role_id, can_post, can_approve, can_manage_users, can_announce)
  SELECT role_id, TRUE, FALSE, FALSE, FALSE FROM roles WHERE role_name = 'student'
ON CONFLICT DO NOTHING;

INSERT INTO tags (tag_name) VALUES
  ('Technology'),('Research'),('Innovation'),('Academic'),
  ('Computing'),('Business'),('Engineering'),('Science')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED USERS  (passwords are bcrypt hashes of the plain text shown)
-- Admin    → admin@cornerstone.edu.in   / Admin@1234
-- Assessor → assessor@cornerstone.edu.in / Assess@1234
-- Student  → student@cornerstone.edu.in  / Student@1234
-- ============================================================
INSERT INTO users (name, email, pwd, role_id, dept_id)
VALUES
  ('System Admin',
   'admin@cornerstone.edu.in',
   '$2a$12$A8e1p0JQL5YcaHRLBpqtHuEdGTZxZXoJBRmP.lw7K5VYZ3aVRceoC',
   (SELECT role_id FROM roles WHERE role_name='admin'),
   NULL),
  ('Dr. Assessor',
   'assessor@cornerstone.edu.in',
   '$2a$12$7G3Ff8XoPQeZXVvNrkIPkeUKjDPQE3W7Rn8GvqMRKT4T0.rVBVJyy',
   (SELECT role_id FROM roles WHERE role_name='assessor'),
   (SELECT dept_id FROM departments WHERE dept_name='Computing')),
  ('Test Student',
   'student@cornerstone.edu.in',
   '$2a$12$SIFkVlFJPfWxINm2K7Vz.OeqPAhqNm8.sxH2O1KY0Z5bWkNdZIZRy',
   (SELECT role_id FROM roles WHERE role_name='student'),
   (SELECT dept_id FROM departments WHERE dept_name='Computing'))
ON CONFLICT (email) DO NOTHING;

-- Sample announcement (requires admin user to exist)
INSERT INTO announcements (title, content, category, author_id)
SELECT
  'Welcome to KCIC Academic Platform',
  'Welcome to the Kings Cornerstone International College academic blogging platform. Students can submit blog posts for review, and department heads can approve content before it goes live.',
  'general',
  user_id
FROM users WHERE email = 'admin@cornerstone.edu.in'
ON CONFLICT DO NOTHING;
