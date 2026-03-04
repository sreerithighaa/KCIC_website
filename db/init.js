require('dotenv').config();
const pool = require('./pool');

const initializeDatabase = async () => {
  try {
    // Create posts table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);
    console.log('Posts table created successfully');

    // Optional: Insert sample data
    const insertSampleData = `
      INSERT INTO posts (title, content) 
      SELECT 'First Post', 'This is the first post' 
      WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'First Post');
    `;
    
    await pool.query(insertSampleData);
    console.log('Sample data inserted');

    await pool.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    await pool.end();
    process.exit(1);
  }
};

initializeDatabase();
