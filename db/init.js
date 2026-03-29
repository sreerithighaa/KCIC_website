require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const pool = require('./pool');

async function init() {
  console.log('Initialising KCIC database…');
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Schema + seed users applied.');

    const seed = fs.readFileSync(path.join(__dirname, 'seed_posts.sql'), 'utf8');
    await pool.query(seed);
    console.log('Demo posts and announcements seeded.');

    console.log('\nTables created:');
    const tables = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
    );
    tables.rows.forEach(r => console.log('  •', r.tablename));
    console.log('\nDatabase ready! Run: npm start');
  } catch (err) {
    console.error('Init failed:', err.message);
  } finally {
    await pool.end();
  }
}

init();