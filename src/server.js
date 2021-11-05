const fs        = require('fs');
const path      = require('path');
const express   = require('express');
const cors 	= require('cors');
const sendSeekable = require('send-seekable');
const app       = express();
const bodyParser = require('body-parser');
const YAML      = require('yaml')
const pino      = require('pino');
const { isModuleNamespaceObject } = require('util/types');
const { builtinModules } = require('module');

// Hokey installation detection.
let systemInstall = false;
if (path.basename(__dirname) === 'bin') {
  systemInstall = true;
}

// If the MUSETTE_SETTINGS_DIR env variable is provided, that is used as the settings dir.
// If the process is determined to be running from within a 'bin' directory, the parent path is used with etc/musette appended for the settings dir.
// Otherwise the settings dir is the cwd.
let settings_dir = process.env.MUSETTE_SETTINGS_DIR;
if (!settings_dir) {
  if (systemInstall) {
    settings_dir = path.join(path.dirname(__dirname), 'etc/musette');
  } else {
    settings_dir = './';
  }
}

// If the MUSETTE_SETTINGS_FILE env variable is provided, then that is used for the settings file instead of 'settings.yaml'.
// If the settings file, whether env or default, is not an absolute path, then the settings file path is appended to the settings dir path.
let settings_file = process.env.MUSETTE_SETTINGS_FILE || 'settings.yaml';
if (!path.isAbsolute(settings_file)) {
  settings_file = path.join(settings_dir, settings_file);
}

let settings
try {
  let p = path.resolve(settings_file);
  console.log('Loading settings from', p);
  settings = YAML.parse(fs.readFileSync(p, 'utf8'));
} catch(err) {
  console.error(err);
  return 1;
}

let plugins_dir = process.env.MUSETTE_PLUGINS_DIR || settings.plugins_root;
if (!plugins_dir) {
  if (systemInstall) {
    plugins_dir = path.join(path.dirname(__dirname), 'share/musette/plugins');
  } else {
    plugins_dir = './plugins';
  }
}

let web_root = process.env.MUSETTE_WEB_ROOT || settings.web_root
if (!web_root) {
  if (systemInstall) {
    web_root = path.join(path.dirname(__dirname), 'share/musette/frontend');
  } else {
    web_root = '../frontend/sauce';
  }
}

module.settings = settings;
module.plugins = {};
// Set up logging.
let transportTargets = []
if (process.stdout.isTTY) {
  transportTargets.push({
    level: 'info',
    target: 'pino-pretty',
  })
}
module.logger = pino({
  base: undefined,
  transport: {
    targets: transportTargets,
  },
});

module.api_settings = {
  "min_version": "1.0.0",
  "api": {
    "browse": "1.0.0",
    "info": "1.0.0",
    "play": "1.0.0",
  },
  "requires": { }
};

const api = require('./api')({
  settings: module.settings, 
  api: module.api_settings
});

if (settings.cors) {
  app.use(cors(settings.cors));
}

app.use(express.static(web_root));

app.use(bodyParser.json());
app.use(sendSeekable);

if (settings.plugins) {
  let p = path.resolve(plugins_dir)
  module.logger.info({path: p, plugins: Object.keys(settings.plugins)}, 'Loading plugins...')
  for (let key in settings.plugins) {
    module.settings.plugins[key] = {...module.settings.plugins[key]}
    let l = module.logger.child({plugin: key})
    let plugin = require(path.join(p, key))(module.settings.plugins[key], module, l);
    plugin.log = l
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
    if (plugin.provides_api) {
      for (let key in plugin.provides_api) {
        module.api_settings.api[key] = plugin.provides_api[key]
      }
    }
    if (plugin.client_requires) {
      for (let key in plugin.client_requires) {
        module.api_settings['requires'][key] = plugin.client_requires[key];
      }
    }
    module.plugins[key] = plugin;
  }
}

app.use('/api', api);

const port = settings.port;
app.listen(port, () => {
  module.logger.info({port, web_root: web_root, music_root: module.settings.music_root}, 'Serving...')
});

// Let plugins know to the server has started. Useful for plugins that do large processing.
;(async () => {
  for (let key in module.plugins) {
    let plugin = module.plugins[key];
    if (plugin.load) {
      const l = plugin.load(module);
      if (l instanceof Promise) {
        await l
      }
    }
  }
})()
