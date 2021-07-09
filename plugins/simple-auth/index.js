const session = require('express-session');

module.exports = function (settings) {
  return {
    name: "simple-auth",
    version: "1.0.0",
    routes: [
      ["ALL", "*", session({
        secret: 'musette',
        resave: false,
        saveUninitialized: true
      })],
      [["GET","POST"], "auth/login", (req, res) => {
        if (req.body.username == settings.username && req.body.password == settings.password) {
          req.session.isValid = true;
          res.status(200).send(JSON.stringify({
            status: 200,
            message: "OK"
          }));
        } else {
          res.status(401).send(JSON.stringify({
            status: 401,
            message: "INVALID"
          }));
        }
      }],
      [["GET"], "auth/logout", (req, res) => {
        if (req.session.isValid) {
          req.session.isValid = false;
          res.status(200).send(JSON.stringify({
            status: 200,
            message: "OK"
          }));
        } else {
          res.status(403).send(JSON.stringify({
            status: 403,
            message: "NOT LOGGED IN"
          }));
        }
      }],
      ["*", ["/api/:all", "/api"], (req, res, next) => {
        if (!req.session.isValid) {
          res.status(401).send(JSON.stringify({
            status: 401,
            message: "LOGIN"
          }));
        } else {
          next();
        }
      }]
    ],
    client_requires: {
      "auth": "1.0.0"
    }
  };
}

