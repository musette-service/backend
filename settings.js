const path = require('path');

module.exports = {
  "web_root": path.resolve(__dirname, "../musette-client"),
  "music_root": "/media/ext/Music",
  "port": 8080,
  "plugins": {
    "simple-auth": {
      "username": "musette",
      "password": "musette"
    }
  },
  //"throttle": 256 // throttles to kbps
}
