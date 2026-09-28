const request = require('supertest');
const bcrypt = require('bcrypt');

// Use the in-memory database instead of the real blog.db
jest.mock('../database', () => require('./helpers/mockDatabase'));

const app = require('../app');
const { resetDb, createUser, getUser, countUsers, closeDb } = require('./helpers/db');

beforeEach(resetDb);
afterAll(closeDb);

describe('GET /auth/login and GET /auth/register', () => {
  test('shows the login form', async () => {
    const res = await request(app).get('/auth/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('action="/auth/login"');
  });

  test('shows the register form', async () => {
    const res = await request(app).get('/auth/register');
    expect(res.status).toBe(200);
    expect(res.text).toContain('action="/auth/register"');
  });
});

describe('POST /auth/register', () => {
  test('creates a new user and redirects to the login page', async () => {
    const res = await request(app)
      .post('/auth/register')
      .type('form')
      .send({ username: 'alice', password: 'secret123' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
    expect(await countUsers()).toBe(1);
  });

  test('stores a bcrypt hash, not the plain password', async () => {
    await request(app)
      .post('/auth/register')
      .type('form')
      .send({ username: 'alice', password: 'secret123' });

    const user = await getUser('alice');
    expect(user.password).not.toBe('secret123');
    expect(bcrypt.compareSync('secret123', user.password)).toBe(true);
  });

  test('does not create a second user with the same name', async () => {
    await createUser('alice', 'original-password');

    await request(app)
      .post('/auth/register')
      .type('form')
      .send({ username: 'alice', password: 'other-password' });

    expect(await countUsers()).toBe(1);
    const user = await getUser('alice');
    expect(bcrypt.compareSync('original-password', user.password)).toBe(true);
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => createUser('alice', 'secret123'));

  test('with the right password sets a sessionId cookie and redirects to /', async () => {
    const res = await request(app)
      .post('/auth/login')
      .type('form')
      .send({ username: 'alice', password: 'secret123' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^sessionId=[0-9a-f]{64}/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  test('saves the same sessionId in the database', async () => {
    const res = await request(app)
      .post('/auth/login')
      .type('form')
      .send({ username: 'alice', password: 'secret123' });

    const cookieValue = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const user = await getUser('alice');
    expect(user.sessionId).toBe(cookieValue);
  });

  test('with a wrong password shows an error and sets no cookie', async () => {
    const res = await request(app)
      .post('/auth/login')
      .type('form')
      .send({ username: 'alice', password: 'wrong-password' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Invalid username or password');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('with an unknown username shows the same error and sets no cookie', async () => {
    const res = await request(app)
      .post('/auth/login')
      .type('form')
      .send({ username: 'nobody', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Invalid username or password');
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

describe('GET /auth/logout', () => {
  test('clears the sessionId cookie and redirects to the login page', async () => {
    const res = await request(app).get('/auth/logout');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
    expect(res.headers['set-cookie'][0]).toMatch(/^sessionId=;/);
  });
});
