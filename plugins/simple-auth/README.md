# musette-server plugin: simple-auth
This plugin provides _very_ basic authentication to the server.

The username and password is defined in the module's entry in the settings.js file as below:

    plugins: {
      "simple-auth": {
        "username": "musette",
        "password": "musette"
      }
    }

It employs the "auth" API as described in the API section.

## API
All defined objects enclosed in curly braces denote JSON.

  * GET /api | GET /api/*
    * if unauth'd, sends `{ status: 401, message: "LOGIN" }`
  * POST /api/auth/login
    * client sends `{username: ..., password: ...}`
  * GET /api/auth/logout
    * if logged in: `{status: 200, message: "OK"}`
    * if not logged in: `{status: 403, message: "NOT LOGGED IN"}`
