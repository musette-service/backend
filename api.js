const express = require('express');

const router = express.Router();

const path = require('path');

const ThrottleGroup = require('stream-throttle').ThrottleGroup
const tg = new ThrottleGroup({rate: 131072});

const settings = require('./settings');

const file_accessor = require('./files-accessor');

const sendFiles = (dir, req, res) => {
  file_accessor.files(path.normalize(dir), (err, files) => {
    if (err) {
      if (err.code == 'EACCES') {
        res.status(400).send('Bad Request');
      } else if (err.code == 'ENOENT') {
        res.status(404).send('No such Directory');
      } else {
        res.status(500).send('Unhandled Error');
      }
      return;
    }
    res.send(JSON.stringify(files));
  });
};

router.get('/browse', (req, res) => {
  sendFiles('/', req, res);
});

router.get(['/browse/:file_path*', '/browse/:file_path'], (req, res) => {
  sendFiles(path.normalize(path.join(req.params.file_path, req.params[0])), req, res);
});

router.get(['/play/:file_path*', '/play/:file_path'], (req, res) => {
  file_accessor.readStream(path.normalize(path.join(req.params.file_path, req.params[0])), (err, stream) => {
    if (err) {
      console.log('err');
      console.log(err);
      res.status(500).send();
      return;
    }
    res.status(200);
    let throttle = stream.pipe(tg.throttle());
    throttle.pipe(res);
  });
});

router.get(['/info/:file_path*', '/info/:file_path'], (req, res) => {
  let full_path = file_accessor.getAbsolute(settings.root, path.normalize(path.join(req.params.file_path, req.params[0])));
  if (!file_accessor.verifyPath(full_path)) {
    res.status(400);
    res.send("Requested path is unconstrained");
    return;
  }
  console.log('req for ' + full_path);
  file_accessor.readTags(full_path, (err, tags) => {
    if (err) {
      console.log('err');
      console.log(err);
      res.status(500).send();
      return;
    }
    res.send(JSON.stringify(tags));
  });
});

module.exports = router;
