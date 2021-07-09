const fs          = require('fs');
const util        = require('util');
const fsPromises  = {
  readdir:  util.promisify(fs.readdir),
  stat:     util.promisify(fs.stat),
};
const path        = require('path');
const jsmediatags = require('jsmediatags');
const mime        = require('mime-types');
const crypto      = require('crypto');

module.exports = function({api={}, settings={}}={}) {
  let fa = {
    getAbsolute: (root, target_path) => {
      return path.join(root, target_path);
    },
    constrain: (base_path, target_path) => {
      let full_path = path.normalize(path.join(base_path, target_path));
      if (!full_path.startsWith(base_path)) {
        return false;
      }
      return full_path;
    },
    isConfined: (root, full_path) => {
      return full_path.startsWith(root);
    },
    art_cache: {},
    findArtwork: (base_path) => {
      return new Promise((resolve, reject) => {
        if (fa.art_cache[base_path] !== undefined) {
          resolve(fa.art_cache[base_path]);
        } else {
          fa.files_r(base_path, false, 'image/', (err, files) => {
            if (err) {
              fa.art_cache[base_path] = false;
              resolve(fa.art_cache[base_path]);
            } else {
              fs.readFile(path.join(base_path, files[0].path), (err, data) => {
                if (err) {
                  fa.art_cache[base_path] = false;
                } else {
                  let hash = crypto.createHash('sha256');
                  hash.update(Uint8Array.from(data));
                  let val = hash.digest('hex');
                  fa.art_cache[base_path] = {
                    hash: val,
                    format: files[0].mimetype,
                    data: Array.prototype.slice.call(data, 0)
                  }
                }
                resolve(fa.art_cache[base_path]);
              });
            }
          });
        }
      });
    },
    files_r: (base_path, recurse, mimetype, cb) => {
      fsPromises.readdir(base_path)
      .then(items => {
        items = items.filter(item => {
          return item[0] != '.';
        });
        return Promise.all(items.map(item => {
          return new Promise((resolve, reject) => {
            const total_path = path.join(base_path, item);
            fsPromises.stat(total_path)
            .then((stats) => {
              if (stats.isDirectory()) {
                if (recurse) {
                  fa.files_r(total_path, recurse, mimetype, (err, files) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    resolve({path: item, items: files});
                  });
                } else {
                  resolve({path: item, items: []});
                }
              } else {
                let mime_type = mime.lookup(item);
                if (!mime_type || !mime_type.startsWith(mimetype)) {
                  resolve();
                } else {
                  resolve({path: item, mimetype: mime_type});
                }
              }
            })
            .catch(err => {
              reject(err);
            })
          })
        }))
      })
      .then(items => {
        cb(null, items.filter((item) => { if (item) return item; }));
      })
      .catch(err => {
        cb(err, null);
      });
    },
    readStream: (target_path, cb) => {
      fsPromises.stat(target_path)
      .then((stats) => {
        if (stats.isDirectory()) {
          cb(new Error("is dir"), null);
          return;
        }
        let ret = fs.createReadStream(target_path);
        // Probably shouldn't do this.
        ret.size = stats.size;
        cb(null, ret);
      })
      .catch((err) => {
        cb(err, null);
      })
    },
    readTag: (target_path, cb) => {
      new jsmediatags.Reader(target_path)
      .setTagsToRead(['title', 'artist', 'album', 'track', 'year', 'genre', 'picture'])
      .read({
        onSuccess: tag => {
          cb(null, {title: tag.tags.title, artist: tag.tags.artist, album: tag.tags.album, track: tag.tags.track, year: tag.tags.year, genre: tag.tags.genre, picture: tag.tags.picture});
        },
        onError: error => {
          cb(error, null);
        }
      });
    },
    verifyPath: (target_path) => {
      if (!fa.isConfined(settings.music_root, target_path)) {
        return false;
      }
      return true;
    },
    readTags: (target_path, cb) => {
      let full_path = target_path;
  
      fsPromises.stat(full_path)
      .then((stats) => {
        if (stats.isDirectory()) {
  
          fsPromises.readdir(full_path)
          .then((files) => {
            return Promise.all(files.map(file => {
              return new Promise((resolve, reject) => {
  
                const full_file_path = path.join(full_path, file);
                fa.readTags(full_file_path, (err, tag) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(tag);
                  }
                });
              });
            }));
          })
          .then((tags) => {
            cb(null, tags);
          })
          .catch((err) => {
            cb(err, null);
          });
  
        } else {
          fa.readTag(full_path, cb);
        }
      })
      .catch((err) => {
        cb(err, null);
      })
    }
  }
  return fa
}
