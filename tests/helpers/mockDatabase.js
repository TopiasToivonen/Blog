// A fake "database.js" for the tests.
// It uses an in-memory SQLite database, so the real blog.db file is never touched.
const sqlite3 = require('sqlite3');

const db = new sqlite3.Database(':memory:');

module.exports = db;
