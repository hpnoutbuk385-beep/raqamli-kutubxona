const db = require('./database');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  try {
    const schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.query(schema);
    console.log('Database initialized successfully!');
  } catch (error) {
    if (error.code === '42710') {
      console.log('Database already initialized.');
    } else {
      console.error('Error initializing database:', error.message);
    }
  }
  process.exit(0);
}

initDatabase();
