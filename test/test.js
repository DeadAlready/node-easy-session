'use strict';
var data = require('./data');

var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');

var easySession = require('../index');

var app = express();
app.use(cookieParser('whut'));

app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

app.use(easySession.main(session, {rbac: data.roles}));

app.get('/', function (req, res, next) {
  res.send(req.session.getRole());
});

app.get('/login/:role', function (req, res, next) {
  req.session.login(req.params.role)
    .then(() => res.redirect('/'))
    .catch(next);
});

app.get('/logout', function (req, res, next) {
  req.session.logout()
    .then(() => res.redirect('/'))
    .catch(next);
});

app.get('/post/save', function (req, res, next) {
  req.session.can('post:save', {userId: 1, ownerId: 1})
    .then(accessGranted => {
      if(accessGranted) {
        res.send('yes');
        return;
      }
      res.sendStatus(403)
    })
    .catch(next);
});

app.get('/post/:operation', function (req, res, next) {
  req.session.can('post:' + req.params.operation)
    .then(accessGranted => {
    if(accessGranted) {
      res.send('yes');
      return;
    }
    res.sendStatus(403)
    })
    .catch(next);
});

app.get('/middleware/post', easySession.can('post:add'), function (req, res, next) {
  res.send('yes');
});

app.get('/middleware/post/delete', easySession.can('post:delete'), function (req, res, next) {
  res.send('yes');
});

app.get('/middleware/post/save/:id', easySession.can('post:save', (req, res) => Promise.resolve({userId: 1, ownerId: +req.params.id})), function (req, res, next) {
  res.send('yes');
});

app.listen(3000);