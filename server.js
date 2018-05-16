const path      = require('path');
const express   = require('express');
const sendSeekable = require('send-seekable');
const app       = express();

const settings  = require('./settings');
const api       = require('./api');

app.use(express.static(settings.web_root));

app.use(sendSeekable);
app.use('/api', api);

const port = settings.port;
app.listen(port, () => {
  console.log('Listening on ', port);
});
