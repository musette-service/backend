const express = require('express');

const router = express.Router();

const path = require('path');

const brake = require('brake');

const settings = require('./settings');

const file_accessor = require('./files-accessor');

router.get('/browse', (req, res) => {
  file_accessor.files_r(settings.music_root, false, (err, files) => {
    res.send(JSON.stringify(files));
  });
});

router.get(['/browse/:file_path*', '/browse/:file_path'], (req, res) => {
  let target_path = file_accessor.constrain(settings.music_root, path.join(req.params.file_path, req.params[0]));
  if (!target_path) {
      res.status(500).send();
      return;
  }
  file_accessor.files_r(target_path, false, (err, files) => {
    res.send(JSON.stringify(files));
  });
});

router.get(['/play/:file_path*', '/play/:file_path'], (req, res) => {
  let target_path = file_accessor.constrain(settings.music_root, path.join(req.params.file_path, req.params[0]));
  if (!target_path) {
      res.status(400).send();
      return;
  }
  file_accessor.readStream(target_path, (err, stream) => {
    if (err) {
      res.status(500).send();
      return;
    }
    res.status(200);

    res.sendSeekable(stream.pipe(brake({rate: 256000, period: 1000})), {
      length: stream.size
    });
  });
});

router.get(['/info/:file_path*', '/info/:file_path'], (req, res) => {
  let target_path = file_accessor.constrain(settings.music_root, path.join(req.params.file_path, req.params[0]));
  if (!target_path) {
      res.status(400).send();
      return;
  }

  file_accessor.readTags(target_path, (err, tags) => {
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
