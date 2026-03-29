-- Insert named demo student authors (passwords: Student@1234 same hash)
INSERT INTO users (name, email, pwd, role_id, dept_id)
VALUES
  ('Drew Cano',
   'drew@cornerstone.edu.in',
   '$2a$12$SIFkVlFJPfWxINm2K7Vz.OeqPAhqNm8.sxH2O1KY0Z5bWkNdZIZRy',
   (SELECT role_id FROM roles WHERE role_name='student'),
   (SELECT dept_id FROM departments WHERE dept_name='Computing')),
  ('Alec Whitten',
   'alec@cornerstone.edu.in',
   '$2a$12$SIFkVlFJPfWxINm2K7Vz.OeqPAhqNm8.sxH2O1KY0Z5bWkNdZIZRy',
   (SELECT role_id FROM roles WHERE role_name='student'),
   (SELECT dept_id FROM departments WHERE dept_name='Business')),
  ('Phoenix Baker',
   'phoenix@cornerstone.edu.in',
   '$2a$12$SIFkVlFJPfWxINm2K7Vz.OeqPAhqNm8.sxH2O1KY0Z5bWkNdZIZRy',
   (SELECT role_id FROM roles WHERE role_name='student'),
   (SELECT dept_id FROM departments WHERE dept_name='Business'))
ON CONFLICT (email) DO NOTHING;

-- Post 1: Drew Cano – Computing
INSERT INTO posts (title, content, excerpt, author_id, dept_id, status, approved_by, approved_at)
SELECT
  'Top 10 Javascript Frameworks to Use',
  'JavaScript frameworks have completely transformed the landscape of modern web development. They provide developers with pre-written, standardised code that can be reused to solve common programming tasks, making the development process faster and more efficient.

A JavaScript framework is essentially a collection of JavaScript code libraries that provides a web developer with pre-written code to use for routine programming features and tasks. Rather than starting from scratch, developers can use a framework to build on an existing foundation.

React, developed by Facebook, is currently the most popular JavaScript framework. It uses a component-based architecture that makes it easy to build complex user interfaces. React introduced the concept of a virtual DOM which improves performance by minimising direct manipulation of the actual DOM.

Angular, maintained by Google, is a comprehensive framework that provides everything you need to build large-scale enterprise applications. It uses TypeScript by default and follows the MVC pattern, making it highly structured and maintainable.

Vue.js is known for its gentle learning curve and flexibility. It can be adopted incrementally, meaning you can use as much or as little of the framework as you need. Vue is particularly popular for building single-page applications.

Svelte takes a different approach by shifting the work to compile time rather than doing it in the browser. This results in smaller bundle sizes and better runtime performance compared to traditional frameworks.

Next.js is a React-based framework that enables server-side rendering and static site generation. It is widely used for production-grade applications that need good SEO performance and fast initial page loads.',
  'JavaScript frameworks make development easy with extensive features and functionalities for building modern web applications.',
  (SELECT user_id FROM users WHERE email = 'drew@cornerstone.edu.in'),
  (SELECT dept_id FROM departments WHERE dept_name = 'Computing'),
  'approved',
  (SELECT user_id FROM users WHERE email = 'admin@cornerstone.edu.in'),
  NOW() - INTERVAL '10 days'
ON CONFLICT DO NOTHING;

-- Post 2: Alec Whitten – Business
INSERT INTO posts (title, content, excerpt, author_id, dept_id, status, approved_by, approved_at)
SELECT
  'Bill Walsh Leadership Lessons',
  'Bill Walsh is widely regarded as one of the greatest coaches in NFL history. His transformation of the San Francisco 49ers from a struggling franchise into a dynasty is one of the most remarkable stories in sports history, and the leadership lessons he applied are just as relevant in business and academic life today.

When Walsh took over the 49ers in 1979, the team had won just two games the previous season. They were considered one of the worst teams in the league. Within three years, he had led them to their first Super Bowl championship. They would go on to win three Super Bowls under his leadership.

One of Walsh''s most important leadership principles was what he called the Standard of Performance. Rather than focusing exclusively on winning, he focused on building a culture of excellence in everything the team did. He believed that if you established the right habits, processes, and mindset, winning would be the natural result.

Walsh was known for his meticulous attention to detail. He scripted the first 25 plays of every game in advance, a practice that was considered unusual at the time. This preparation gave his team confidence and helped them execute under pressure because they had rehearsed every scenario.

He was also a pioneer in developing talent. Walsh believed in building players up rather than breaking them down. He invested heavily in coaching and mentoring, creating a system that produced an extraordinary number of future NFL coaches and executives.

Communication was another cornerstone of Walsh''s leadership. He believed that people perform better when they understand the why behind decisions. He was transparent with his team about strategy and expectations, which built trust and commitment.',
  'I like to know the secrets of transforming a 2-14 team into a 3x Super Bowl winning dynasty through great leadership.',
  (SELECT user_id FROM users WHERE email = 'alec@cornerstone.edu.in'),
  (SELECT dept_id FROM departments WHERE dept_name = 'Business'),
  'approved',
  (SELECT user_id FROM users WHERE email = 'admin@cornerstone.edu.in'),
  NOW() - INTERVAL '6 days'
ON CONFLICT DO NOTHING;

-- Post 3: Phoenix Baker – Business
INSERT INTO posts (title, content, excerpt, author_id, dept_id, status, approved_by, approved_at)
SELECT
  'Migrating to Linear 101',
  'Linear is a modern project management tool that has quickly become the go-to choice for software development teams looking for a faster, more streamlined alternative to traditional tools like Jira or Trello. If your team is considering migrating to Linear, this guide will walk you through everything you need to know.

Linear was built with speed as a core principle. The application uses keyboard shortcuts extensively and loads almost instantly, making it significantly faster to use than most alternatives. For development teams who spend a large portion of their day in their project management tool, this speed improvement has a real impact on productivity.

Before starting your migration, the first step is to audit your current workflow. Document all the project types you manage, the stages each project goes through, the custom fields you use, and the integrations you depend on. This audit will help you identify any gaps between your current setup and what Linear provides out of the box.

Linear organises work around teams, projects, cycles, and issues. Teams are the top-level organisational unit. Projects group related work together. Cycles are Linear''s version of sprints, typically two-week periods of focused work. Issues are the individual tasks or bugs that need to be completed.

One of Linear''s most powerful features is its roadmap view. Unlike simple kanban boards, Linear''s roadmap gives you a visual timeline of when projects and milestones are expected to be completed. This is particularly useful for communicating plans to stakeholders.

Linear integrates natively with GitHub, GitLab, and Bitbucket, allowing you to link pull requests and commits directly to issues. When a developer opens a PR that references a Linear issue, the issue status can be automatically updated.',
  'Linear helps streamline software projects, sprints, tasks, and bug tracking. Here is how to get started the right way.',
  (SELECT user_id FROM users WHERE email = 'phoenix@cornerstone.edu.in'),
  (SELECT dept_id FROM departments WHERE dept_name = 'Business'),
  'approved',
  (SELECT user_id FROM users WHERE email = 'admin@cornerstone.edu.in'),
  NOW() - INTERVAL '4 days'
ON CONFLICT DO NOTHING;

-- Seed 3 announcements (for the home page Latest Announcements section)
INSERT INTO announcements (title, content, category, author_id, created_at)
SELECT
  'Revaluation Application Window Open',
  'Students who wish to apply for revaluation of their answer scripts can now submit their requests through the student portal. The last date for applications is 30th January 2026. Students are advised to submit their requests before the deadline to avoid late fees.',
  'general',
  (SELECT user_id FROM users WHERE email = 'admin@cornerstone.edu.in'),
  NOW() - INTERVAL '8 days'
ON CONFLICT DO NOTHING;

INSERT INTO announcements (title, content, category, author_id, created_at)
SELECT
  'Symposium Fest 2026 – Registrations Open',
  'The annual Symposium Fest 2026 is now open for registrations. Students from all departments are invited to participate in technical and non-technical events. Prizes worth Rs. 50,000 are up for grabs. Register through the student portal before 5th February 2026.',
  'event',
  (SELECT user_id FROM users WHERE email = 'admin@cornerstone.edu.in'),
  NOW() - INTERVAL '5 days'
ON CONFLICT DO NOTHING;

INSERT INTO announcements (title, content, category, author_id, created_at)
SELECT
  'Guest Lecture on Artificial Intelligence',
  'The Department of Computing is pleased to announce a guest lecture on Artificial Intelligence by industry expert Dr. Anand Rajan on 25th January 2026 at 10:00 AM in the Main Hall. All students are encouraged to attend.',
  'academic',
  (SELECT user_id FROM users WHERE email = 'admin@cornerstone.edu.in'),
  NOW() - INTERVAL '3 days'
ON CONFLICT DO NOTHING;
