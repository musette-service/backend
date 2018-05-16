const fsPromises  = require('fs').promises;
const fs          = require('fs');
const util        = require('util');
const path        = require('path');
const settings    = require('./settings');
const jsmediatags = require('jsmediatags');

module.exports = {
  getAbsolute: (root, target_path) => {
    return path.join(root, target_path);
  },
  isConfined: (root, full_path) => {
    console.log('checking: ' + root + ' vs ' + full_path);
    console.log(full_path.startsWith(root));
    return full_path.startsWith(root);
  },
  files: (target_path, cb) => {
    let full_path = module.exports.getAbsolute(settings.root, target_path);
    if (!module.exports.isConfined(settings.root, full_path)) {
      const error     = new Error("Requested path is unconstrained");
      error.code      = 'EACCES';
      error.name      = 'Bad Request';
      error.http_code = '400';
      cb(error, null);
      return;
    }

    fsPromises.readdir(full_path)
    .then((files) => {
      return Promise.all(files.map(file => {
        return new Promise((resolve, reject) => {
          const full_file_path = path.join(full_path, file);
          fsPromises.stat(full_file_path)
          .then((stats) => {
            resolve({directory: stats.isDirectory(), name: file});
          })
          .catch((err) => {
            reject(err);
          })
        });
      }));
    })
    .then((files) => {
      cb(null, files);
    })
    .catch((err) => {
      cb(err, null);
    });
  },
  readStream: (target_path, cb) => {

    let full_path = module.exports.getAbsolute(settings.root, target_path);
    if (!module.exports.isConfined(settings.root, full_path)) {
      const error     = new Error("Requested path is unconstrained");
      error.code      = 'EACCES';
      error.name      = 'Bad Request';
      error.http_code = '400';
      cb(error, null);
      return;
    }

    fsPromises.stat(full_path)
    .then((stats) => {
      if (stats.isDirectory()) {
        cb(new Error("is dir"), null);
        return;
      }
      let ret = fs.createReadStream(full_path);
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
    if (!module.exports.isConfined(settings.root, target_path)) {
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
          console.log("OH");
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
