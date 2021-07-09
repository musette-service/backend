const express = require('express');
const router = express.Router();

const path    = require('path');
const brake   = require('brake');
const crypto  = require('crypto');


module.exports = function({api={}, settings={}}={}) {
  const file_accessor = require('./files-accessor')({api, settings});
  
  router.get('/browse%2F', (req, res) => {
    file_accessor.files_r(settings.music_root, false, 'audio/', (err, files) => {
      res.send(JSON.stringify(files));
    });
  });
  
  router.get(['/browse%2F:file_path*', '/browse%2F:file_path'], (req, res) => {
    let target_path = file_accessor.constrain(settings.music_root, decodeURIComponent(path.join(req.params.file_path, req.params[0])));
    if (!target_path) {
        res.status(500).send();
        return;
    }
    file_accessor.files_r(target_path, false, 'audio/', (err, files) => {
      res.send(JSON.stringify(files));
    });
  });
  
  router.get(['/play%2F:file_path*', '/play%2F:file_path'], (req, res) => {
    let target_path = file_accessor.constrain(settings.music_root, decodeURIComponent(path.join(req.params.file_path, req.params[0])));
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
  
      if (typeof settings.throttle === 'undefined') {
        res.sendSeekable(stream, {
          length: stream.size
        });
      } else {
        res.sendSeekable(stream.pipe(brake(settings.throttle*1000, 1000)), {
          length: stream.size
        });
      }
    });
  });
  
  router.get(['/info%2F:file_path*', '/info%2F:file_path', '/info%2F'], (req, res) => {
    let base_path = req.params.file_path ? decodeURIComponent(path.join(req.params.file_path, req.params[0])) : '';
    let cached_art = req.query.art || [];
  
    let pending = req.query.tracks.length;
    let matches = {
      art: {},
      tracks: []
    };
    for (let i = 0; i < req.query.tracks.length; i++) {
      let target_path = file_accessor.constrain(settings.music_root, path.join(base_path, req.query.tracks[i]));
      if (!target_path) {
        // 400
        matches.tracks[i] = Object.assign({filename: path.join(base_path, req.query.tracks[i]), err: 400});
        pending--;
        continue;
      }
      // Get any existing artwork in the directory
      file_accessor.findArtwork(file_accessor.constrain(settings.music_root, base_path))
      .then(result => {
        let dir_artwork = result;
        file_accessor.readTags(target_path, (err, tags) => {
          pending--;
          if (err) {
            if (err.type == 'tagFormat') {
              // Couldn't read tags so we'll just send the filename back
              matches.tracks[i] = Object.assign({filename: path.join(base_path, req.query.tracks[i])}, {});
            } else {
              // Error on our side
              matches.tracks[i] = Object.assign({filename: path.join(base_path, req.query.tracks[i]), err: 500});
            }
          } else {
            matches.tracks[i] = Object.assign({filename: path.join(base_path, req.query.tracks[i])}, tags);
          }
          if (pending == 0) {
            for (let i = 0; i < matches.tracks.length; i++) {
              if (matches.tracks[i].picture) {
                let hash = crypto.createHash('sha256');
                hash.update(Uint8Array.from(matches.tracks[i].picture.data));
                let val = hash.digest('hex');
                // Only send the artwork if it was not included as part of the query
                if (cached_art.indexOf(val) == -1 && !matches.art[val]) {
                  matches.art[val] = matches.tracks[i].picture;
                }
                matches.tracks[i].picture = val;
              } else if (dir_artwork) {
                if (cached_art.indexOf(dir_artwork.hash) == -1 && !matches.art[dir_artwork.hash]) {
                  matches.art[dir_artwork.hash] = dir_artwork;
                }
                matches.tracks[i].picture = dir_artwork.hash;
              }
            }
            res.send(JSON.stringify(matches));
          }
        });
      });
    }
  });
  
  router.get('/', (req, res) => {
    // Send our API capabilities and requirements here
    // Note: this would probably be populated through modules, such as:
    // module {
    //  routes: '/': (req, res) => { }
    //  capabilities: [{name: 'browse'}],
    //  client_requires: [{ name: "auth", min: "1.0.0" }],
    // }
    res.send(JSON.stringify(api));
  });

  return router;
}
