const path      = require('path');
const express   = require('express');
const sendSeekable = require('send-seekable');
const app       = express();
const bodyParser = require('body-parser');

const settings  = require('./settings');
const api       = require('./api');

module.settings = settings;

module.api_settings = {
  "min_version": "1.0.0",
  "api": [
    "browse",
    "info",
    "play"
  ],
  "requires": { }
};

app.use(express.static(settings.web_root));

app.use(bodyParser.json());
app.use(sendSeekable);

if (settings.plugins) {
  for (let key in settings.plugins) {
    let plugin = require(path.join(__dirname, 'plugins', key));
    for (let route of plugin.routes) {
      let methods = (Array.isArray(route[0]) ? route[0] : new Array(route[0]));
      for (let method of methods) {
        if (Array.isArray(route[1])) {
          for (let i = 0; i < route[1].length; i++) {
            if (route[1][i].charAt(0) !== '/') {
              route[1][i] = '/api/'+route[1][i];
            }
          }
        } else {
          if (route[1].charAt(0) !== '/') {
            route[1] = '/api/'+route[1];
          }
        }
        if (method == '*') {
          app.use(route[1], route[2]);
        } else {
          app[method.toLowerCase()]((route[1].charAt(0) !== '/' ? '/api/'+route[1] : route[1]), route[2]);
        }
      }
    }
    for (let key in plugin.client_requires) {
      module.api_settings['requires'][key] = plugin.client_requires[key];
    }
  }
}

app.use('/api', api);

const port = settings.port;
app.listen(port, () => {
  console.log('Listening on ', port);
});
