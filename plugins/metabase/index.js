const path = require('path')
const fsPromises = require('fs').promises

const mm = require('music-metadata')
const loki = require('lokijs')
const mime = require('mime-types')

// Functions
async function* getFiles(root, relDir) {
  const p = path.join(root, relDir)
  const dirents = await fsPromises.readdir(p, { withFileTypes: true })
  for (const dirent of dirents) {
    const res = path.join(relDir, dirent.name)
    if (dirent.isDirectory()) {
      yield* getFiles(root, res)
    } else {
      yield path.relative(root, path.join(root, res))
    }
  }
}

async function processFile(f, {music_root, albums, tracks, covers, images}) {
  let results = await mm.parseFile(path.join(music_root, f))
  let track = tracks.insert({
    path: f,
    title: results.common.title,
    album: null,
    number: results.common.track?.no,
  })

  // Find or create our album
  let album = albums.findOne({title: results.common.album})
  if (!album) {
    album = albums.insert({
      cover: null,
      title: results.common.album,
      artist: results.common.albumartist || results.common.artist,
      tracks: [],
      year: results.common.year,
    })

    // Attempt to read in a cover if we don't have one.
    let cover = covers.findOne({album: album.$loki})
    if (!cover) {
      let img = images[path.dirname(f)]
      if (img) {
        cover = covers.insert({
          data: await fsPromises.readFile(path.join(music_root, img.path)),
          mimetype: img.mimetype,
          album: album.$loki,
        })
      }
    }
    if (cover) {
      album.cover = cover.$loki
    }
  }
  // Set the album cover to this file's cover if it is missing and possible.
  if (!album.cover) {
    const coverData = mm.selectCover(results.common.picture)
    if (coverData) {
      let cover = covers.insert({
        data: coverData.data,
        mimetype: coverData.format,
        album: album.$loki
      })
      album.cover = cover.$loki
    }
  }

  // Link album and track.
  album.tracks.push(track.$loki)
  track.album = album.$loki

  // Update our collections.
  albums.update(album)
  tracks.update(track)
}
//

module.exports = function (settings, server, logger) {
  let db = new loki('Musette')
  let tracks = db.addCollection('tracks', { indices: ['artist', 'album'] })
  let albums = db.addCollection('albums', { indices: ['title', 'cover'] })
  let covers = db.addCollection('covers', { indices: ['album'] })
  let images = {}

  let plugin = {
    name: "metabase",
    version: "0.0.0",
    client_requires: {
      "metabase": "0.0.0"
    },
    provides_api: {
      "metabase": "0.0.0",
    },
    ready: false,
    db: db,
    routes: [
      ["*", ["metabase"], (req, res, next) => {
        if (!plugin.ready) {
          return res.status(503).send("metabase still processing")
        }
        next()
      }],
      [["GET"], "metabase", (req, res) => {
        console.log(req.body)
        res.status(200).send("wip")
      }],
      [["GET"], "metabase/albums", (req, res) => {
        let results
        if (req.query.find) {
          try {
            results = albums.chain().find(JSON.parse(req.query.find))
          } catch(err) {
            return res.status(400).send("bad query")
          }
        } else {
          results = albums.chain()
        }
        if (req.query.sort) {
          try {
            results = results.compoundsort(JSON.parse(req.query.sort))
          } catch(err) {
            return res.status(400).send("bad sort")
          }
        }
        results = results.map(({title, cover, year, $loki})=>({title, cover, year, id: $loki}))
        res.status(200).send(
          results.data({removeMeta: true}),
        )
      }],
      [["GET"], "metabase/albums/:id", (req, res) => {
        let album = albums.get(req.params.id)
        if (!album) {
          return res.status(404).send("no album with id")
        }
        res.status(200).send(
          {
            cover: album.cover,
            title: album.title,
            artist: album.artist,
            tracks: album.tracks,
            year: album.year,
          }
        )
      }],
      [["GET"], "metabase/albums/:id/tracks", (req, res) => {
        let album = albums.get(req.params.id)
        if (!album) {
          return res.status(404).send("no album with id")
        }
        let trackResults = tracks.find({'$loki': { '$in': album.tracks}}).map(v=>v.path)
        res.status(200).send(
          trackResults
          //album.tracks
        )
      }],
      [["GET"], "metabase/tracks/:id", (req, res) => {
        let trackIDs = req.params.id.split('+').map(v=>Number(v))
        let trackResults = tracks.find({'$loki': { '$in': trackIDs}}).map(v=>({path: v.path, title: v.title, number: v.number}))
        res.status(200).send(trackResults)
      }],
      [["GET"], "metabase/covers/:album", (req, res) => {
        let cover = covers.findOne({album: Number(req.params.album)})
        if (!cover) {
          return res.status(404).send("no matching album cover")
        }
        res.contentType(cover.mimetype)
        res.status(200)
        res.send(cover.data)
        res.end()
      }],
    ],
    load: async () => {
      let audioFiles = []
      let startMemory = process.memoryUsage()
      // Collect our files.
      performance.mark('collect start')
      for await (const f of getFiles(server.settings.music_root, '')) {
        let mimetype = mime.lookup(f)
        if (mimetype) {
          if (mimetype.startsWith('audio/')) {
            audioFiles.push(f)
          } else if (mimetype.startsWith('image/')) {
            images[path.dirname(f)] = {path: f, mimetype: mimetype}
            //images.insert({ path: f, dirname: path.dirname(f)})
          }
        }
      }
      performance.mark('collect end')

      // Parse our music.
      performance.mark('process start')
      for await (const f of audioFiles) {
        try {
          await processFile(f, {music_root: server.settings.music_root, albums, tracks, covers, images})
        } catch(err) {
          logger.error(err)
        }
      }
      performance.mark('process end')

      let stopMemory = process.memoryUsage()

      plugin.ready = true

      // Woo.
      logger.info({
        collectionTime: performance.measure('collect', 'collect start', 'collect end').duration,
        processTime: performance.measure('process', 'process start', 'process end').duration,
        rssGrowth: ((stopMemory.rss - startMemory.rss)/1024/1024)+' MB',
        heapGrowth: ((stopMemory.heapTotal - startMemory.heapTotal)/1024/1024)+' MB',
        externalGrowth: ((stopMemory.external - startMemory.external)/1024/1024)+' MB',
        albums: albums.count(),
        covers: covers.count(),
        tracks: tracks.count(),
      }, `Results`)
    }
  }

  return plugin
}
