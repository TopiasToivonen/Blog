// Small helper functions that make the tests shorter.
// require('../../database') gives the in-memory database, because
// each test file replaces ../database with helpers/mockDatabase.
const bcrypt = require('bcrypt');
const db = require('../../database');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// Creates the tables (same as database.js) and empties them.
async function resetDb() {
  await run('CREATE TABLE IF NOT EXISTS posts (id INT, title TEXT, content TEXT)');
  await run('CREATE TABLE IF NOT EXISTS users (username TEXT, password TEXT, sessionId TEXT)');
  await run('DELETE FROM posts');
  await run('DELETE FROM users');
}

// Adds a user. A low bcrypt cost keeps the tests fast.
async function createUser(username, password, sessionId = '0') {
  const hash = bcrypt.hashSync(password, 4);
  await run('INSERT INTO users (username, password, sessionId) VALUES (?, ?, ?)', [
    username,
    hash,
    sessionId,
  ]);
}

function createPost(title, content) {
  return run('INSERT INTO posts (id, title, content) VALUES (?, ?, ?)', [1, title, content]);
}

const getUser = (username) => get('SELECT * FROM users WHERE username = ?', [username]);
const getPosts = () => all('SELECT * FROM posts');
const countUsers = async () => (await get('SELECT COUNT(*) AS n FROM users')).n;

function closeDb() {
  return new Promise((resolve) => db.close(resolve));
}

module.exports = { resetDb, createUser, createPost, getUser, getPosts, countUsers, closeDb };
