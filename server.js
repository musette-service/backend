const path      = require('path');
const express   = require('express');
const app       = express();

const settings  = require('./settings');
const api       = require('./api');

app.use(express.static(settings.web_root));

app.use('/api', api);

const port = settings.port;
app.listen(port, () => {
  console.log('Listening on ', port);
});
