const request = require('supertest');

jest.mock('../database', () => require('./helpers/mockDatabase'));

const app = require('../app');
const { resetDb, createUser, createPost, getPosts, closeDb } = require('./helpers/db');

// Every test user gets a known sessionId, so a test can send it as a cookie.
const USER_COOKIE = 'sessionId=user-session';
const ADMIN_COOKIE = 'sessionId=admin-session';

beforeEach(async () => {
  await resetDb();
  await createUser('bob', 'bob-password', 'user-session');
  await createUser('admin', 'admin-password', 'admin-session');
});
afterAll(closeDb);

describe('GET / (home page)', () => {
  test('redirects to the login page when there is no cookie', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
  });

  test('redirects to the login page when the sessionId is not known', async () => {
    const res = await request(app).get('/').set('Cookie', 'sessionId=does-not-exist');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
  });

  test('shows the posts to a logged-in user', async () => {
    await createPost('Hello title', 'Hello content');

    const res = await request(app).get('/').set('Cookie', USER_COOKIE);
    expect(res.status).toBe(200);
    expect(res.text).toContain('My Blog');
    expect(res.text).toContain('Hello title');
    expect(res.text).toContain('Hello content');
  });

  test('escapes HTML in post titles', async () => {
    await createPost('<script>alert(1)</script>', 'text');

    const res = await request(app).get('/').set('Cookie', USER_COOKIE);
    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain('&lt;script&gt;');
  });
});

describe('/new-post', () => {
  test('GET redirects to the login page without a session', async () => {
    const res = await request(app).get('/new-post');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
  });

  test('GET shows the form to a logged-in user', async () => {
    const res = await request(app).get('/new-post').set('Cookie', USER_COOKIE);
    expect(res.status).toBe(200);
    expect(res.text).toContain('action="/new-post"');
  });

  test('POST without a session redirects to login and saves nothing', async () => {
    const res = await request(app)
      .post('/new-post')
      .type('form')
      .send({ title: 'Sneaky', content: 'No login' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
    expect(await getPosts()).toHaveLength(0);
  });

  test('POST with a session saves the post and redirects to /', async () => {
    const res = await request(app)
      .post('/new-post')
      .set('Cookie', USER_COOKIE)
      .type('form')
      .send({ title: 'My title', content: 'My content' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    const posts = await getPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('My title');
    expect(posts[0].content).toBe('My content');
  });

  test('POST with an empty title shows an error and saves nothing', async () => {
    const res = await request(app)
      .post('/new-post')
      .set('Cookie', USER_COOKIE)
      .type('form')
      .send({ title: '', content: 'No title' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Title is required');
    expect(await getPosts()).toHaveLength(0);
  });

  test('POST with an empty content shows an error and saves nothing', async () => {
    const res = await request(app)
      .post('/new-post')
      .set('Cookie', USER_COOKIE)
      .type('form')
      .send({ title: 'No content', content: '' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Content is required');
    expect(await getPosts()).toHaveLength(0);
  });

});

describe('GET /admin', () => {
  test('is forbidden without a session', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(403);
    expect(res.text).toBe('Access denied');
  });

  test('is forbidden for a normal user', async () => {
    const res = await request(app).get('/admin').set('Cookie', USER_COOKIE);
    expect(res.status).toBe(403);
    expect(res.text).toBe('Access denied');
  });

  test('is allowed for the admin user', async () => {
    const res = await request(app).get('/admin').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Admin Page');
  });

});

describe('navigation menu', () => {
  test('shows Login and Register to visitors', async () => {
    const res = await request(app).get('/auth/login');
    expect(res.text).toContain('Register');
    expect(res.text).not.toContain('Logout');
  });

  test('shows Logout but no Admin link to a normal user', async () => {
    const res = await request(app).get('/new-post').set('Cookie', USER_COOKIE);
    expect(res.text).toContain('Logout');
    expect(res.text).not.toContain('href="/admin"');
  });

  test('shows the Admin link to the admin user', async () => {
    const res = await request(app).get('/new-post').set('Cookie', ADMIN_COOKIE);
    expect(res.text).toContain('href="/admin"');
  });

});

describe('other requests', () => {
  test('serves the stylesheet', async () => {
    const res = await request(app).get('/stylesheets/style.css');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/css/);
  });

  test('returns 404 for an unknown page', async () => {
    const res = await request(app).get('/this-page-does-not-exist');
    expect(res.status).toBe(404);
  });
});
