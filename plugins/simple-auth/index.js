const session = require('express-session');
const settings = module.parent.settings.plugins['simple-auth'];

const SimpleAuthPlugin = {
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

module.exports = SimpleAuthPlugin;
