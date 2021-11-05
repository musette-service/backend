# musette-server plugin: metabase
This plugin provides a database and service for providing album, artist, genre, and similar lookups.

The database is in-memory and stores all album art and the lookup databases. This can consume a decent amount of RAM depending on your library. For a library of around 10,000 songs representing around 700 albums, 300 of which have artwork, it consumes around 400MB.

## API
All defined objects enclosed in curly braces denote JSON.

  * GET /api/metabase
