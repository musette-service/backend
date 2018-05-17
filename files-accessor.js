const fs          = require('fs');
const util        = require('util');
const fsPromises  = {
  readdir:  util.promisify(fs.readdir),
  stat:     util.promisify(fs.stat),
};
const path        = require('path');
const settings    = require('./settings');
const jsmediatags = require('jsmediatags');
const mime        = require('mime-types');

module.exports = {
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
  files_r: (base_path, recurse, cb) => {
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
                module.exports.files_r(total_path, recurse, (err, files) => {
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
              if (!mime_type || !mime_type.startsWith('audio/')) {
                resolve();
              } else {
                resolve({path: item});
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
    jsmediatags.read(target_path, {
      onSuccess: tag => {
        cb(null, tag.tags);
      },
      onError: error => {
        cb(error, null);
      }
    });
  },
  verifyPath: (target_path) => {
    if (!module.exports.isConfined(settings.music_root, target_path)) {
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
              module.exports.readTags(full_file_path, (err, tag) => {
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
          console.log(tags);
          cb(null, tags);
        })
        .catch((err) => {
          cb(err, null);
        });

      } else {
        module.exports.readTag(full_path, cb);
      }
    })
    .catch((err) => {
      cb(err, null);
    })
  }
};
