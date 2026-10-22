const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../database');
const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) throw err;
        if (user && bcrypt.compareSync(password, user.password)) {
            const sessionId = crypto.randomBytes(32).toString('hex');
            db.run("UPDATE users SET sessionId = ? WHERE username = ?", [sessionId, user.username], (err) => {
                if (err) throw err;
                res.cookie('sessionId', sessionId, { httpOnly: true });
                res.redirect('/');
            });
        } else {
            res.render('login', { title: 'Login', error: 'Invalid username or password' });
        }
    });
});

router.get('/register', (req, res) => {
    res.render('register', { title: 'Register' });
});

router.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username){
        return res.status(400).send('Username may not be empty');
    }
    if (password.length <= 8) {
        return res.status(400).send('Password must be longer than 8 characters');
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) throw err;
        if (!user) {
            db.run("INSERT INTO users (username, password, sessionId) VALUES (?, ?, ?)", [username, hashedPassword, 0], (err) => {
                if (err) throw err;
            });
        }
        res.redirect('/auth/login');
    });
});

router.get('/logout', (req, res) => {
    res.clearCookie('sessionId');
    res.redirect('/auth/login');
});

module.exports = router;
