# KCIC Academic Website

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Runtime     | Node.js                           |
| Framework   | Fastify v5                        |
| Database    | PostgreSQL (pg driver)            |
| Templating  | EJS + `@fastify/view`             |
| Frontend    | Bootstrap 5.3 + Bootstrap Icons   |
| Auth        | JWT (`jsonwebtoken`) + bcryptjs   |
| Styling     | Custom CSS (Bootstrap companion)  |

---

## Project Structure

```
kcic/
├── server.js                  ← Entry point, page + API routes
├── .env.example               ← Copy to .env and fill in
├── package.json
│
├── db/
│   ├── pool.js                ← PostgreSQL connection pool
│   ├── schema.sql             ← Full schema + seed data (3NF)
│   └── init.js                ← Run once to initialise DB
│
├── middleware/
│   └── authenticate.js        ← JWT guard + requireRole()
│
├── routes/
│   ├── auth.js                ← POST /api/auth/register, /login, GET /me
│   ├── posts.js               ← Blog CRUD + approve/reject + search
│   ├── announcements.js       ← Announcement CRUD
│   ├── departments.js         ← Department listing
│   └── dashboard.js           ← Role-aware dashboard data endpoints
│
├── views/
│   ├── partials/
│   │   ├── header.ejs         ← Bootstrap navbar (include in every page)
│   │   └── footer.ejs         ← Footer + Bootstrap JS (include in every page)
│   └── pages/
│       ├── home.ejs
│       ├── blogs.ejs
│       ├── blog-view.ejs      ← SSR — post fetched server-side
│       ├── announcements.ejs
│       ├── login.ejs
│       ├── register.ejs
│       ├── dashboard.ejs      ← Role-aware (admin/assessor/student)
│       └── 404.ejs
│
└── public/
    ├── css/style.css          ← Bootstrap overrides + KCIC theme
    └── js/app.js              ← Shared fetch wrapper, Auth, toast, fmtDate

---

## API Endpoints

### Auth
| Method | Route                  | Access  | Description         |
|--------|------------------------|---------|---------------------|
| POST   | /api/auth/register     | Public  | Register new user   |
| POST   | /api/auth/login        | Public  | Login, returns JWT  |
| GET    | /api/auth/me           | Any auth| Current user info   |

### Posts (Blogs)
| Method | Route                  | Access            | Description              |
|--------|------------------------|-------------------|--------------------------|
| GET    | /api/posts             | Public            | Approved posts + search  |
| GET    | /api/posts/:id         | Public            | Single approved post     |
| GET    | /api/posts/my/posts    | Auth              | My submitted posts       |
| POST   | /api/posts             | Student/Admin     | Submit new post          |
| PUT    | /api/posts/:id         | Author/Admin      | Edit pending post        |
| DELETE | /api/posts/:id         | Author/Admin      | Delete post              |
| GET    | /api/posts/pending/all | Assessor/Admin    | Posts awaiting approval  |
| PUT    | /api/posts/:id/approve | Assessor/Admin    | Approve post             |
| PUT    | /api/posts/:id/reject  | Assessor/Admin    | Reject post              |
| GET    | /api/posts/all/admin   | Admin             | All posts (any status)   |

### Announcements
| Method | Route                    | Access          | Description             |
|--------|--------------------------|-----------------|-------------------------|
| GET    | /api/announcements       | Public          | Published announcements |
| GET    | /api/announcements/:id   | Public          | Single announcement     |
| POST   | /api/announcements       | Assessor/Admin  | Create announcement     |
| PUT    | /api/announcements/:id   | Assessor/Admin  | Update announcement     |
| DELETE | /api/announcements/:id   | Admin           | Delete announcement     |

### Departments
| Method | Route                  | Access | Description              |
|--------|------------------------|--------|--------------------------|
| GET    | /api/departments       | Public | All departments + stats  |
| GET    | /api/departments/:id   | Public | Dept + its posts         |

### Dashboard
| Method | Route                             | Access   | Description          |
|--------|-----------------------------------|----------|----------------------|
| GET    | /api/dashboard/student            | Student  | Student stats+posts  |
| GET    | /api/dashboard/assessor           | Assessor | Pending queue+stats  |
| GET    | /api/dashboard/admin/stats        | Admin    | Platform-wide stats  |
| GET    | /api/dashboard/admin/users        | Admin    | All users            |
| PUT    | /api/dashboard/admin/users/:id/toggle | Admin | Enable/disable user |
| DELETE | /api/dashboard/admin/users/:id    | Admin    | Delete user          |

---

## Role Permissions

| Feature                  | Admin | Assessor | Student | Public |
|--------------------------|:-----:|:--------:|:-------:|:------:|
| Browse blogs             | ✅    | ✅       | ✅      | ✅     |
| View announcements       | ✅    | ✅       | ✅      | ✅     |
| Submit blog post         | ✅    | —        | ✅      | —      |
| Approve/reject posts     | ✅    | ✅       | —       | —      |
| Publish announcements    | ✅    | ✅       | —       | —      |
| Manage all users         | ✅    | —        | —       | —      |
| View all posts (any status)| ✅  | —        | —       | —      |

---


## Database Schema (3NF)

```
roles           → role_id, role_name
departments     → dept_id, dept_name, description
users           → user_id, name, email, pwd, role_id(FK), dept_id(FK), is_active
posts           → post_id, title, content, excerpt, author_id(FK), dept_id(FK), status, approved_by(FK)
tags            → tag_id, tag_name
post_tags       → post_id(FK), tag_id(FK)  [junction table]
announcements   → ann_id, title, content, category, author_id(FK), is_published
dashboard_access→ access_id, role_id(FK), can_post, can_approve, can_manage_users, can_announce
```
