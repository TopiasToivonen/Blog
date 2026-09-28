const express = require('express');
const request = require('supertest');
const usersRouter = require('../routes/users');

// routes/users.js is not used by app.js, so it is tested in a tiny app of its own.
const app = express();
app.use('/users', usersRouter);

describe('users router', () => {
  test('GET /users answers with a text message', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(res.text).toBe('respond with a resource');
  });
});
