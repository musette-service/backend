const path    = require('path');
const express = require('express');
const app     = express();

const api     = require('./api');

app.use(express.static(path.join(__dirname, '../client/')));

app.use('/api', api);

const port = 8080;
app.listen(port, () => {
  console.log('Listening on ', port);
});
