const express = require('express');
const { db } = require('../db');

const router = express.Router();

// GET /charts - return all tracks as charts
router.get('/charts', (req, res) => {
  try {
    const tracks = db.prepare('SELECT * FROM tracks ORDER BY play_count DESC').all();
    res.json({ data: tracks, total: tracks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /artists - return distinct artists with track count
router.get('/artists', (req, res) => {
  try {
    const artists = db.prepare(
      'SELECT artist, COUNT(*) as track_count FROM tracks WHERE artist IS NOT NULL GROUP BY artist ORDER BY artist'
    ).all();
    res.json({ data: artists, total: artists.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /artists/:id - return artist info + their tracks
router.get('/artists/:id', (req, res) => {
  try {
    const artistName = req.params.id;
    const tracks = db.prepare('SELECT * FROM tracks WHERE artist = ?').all(artistName);
    if (tracks.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    const totalPlays = tracks.reduce((sum, t) => sum + (t.play_count || 0), 0);
    res.json({
      data: {
        name: artistName,
        track_count: tracks.length,
        total_plays: totalPlays,
        tracks,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /albums - return distinct albums
router.get('/albums', (req, res) => {
  try {
    const albums = db.prepare(
      'SELECT album, artist, COUNT(*) as track_count FROM tracks WHERE album IS NOT NULL GROUP BY album ORDER BY album'
    ).all();
    res.json({ data: albums, total: albums.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /albums/:id - return album info + its tracks
router.get('/albums/:id', (req, res) => {
  try {
    const albumName = req.params.id;
    const tracks = db.prepare('SELECT * FROM tracks WHERE album = ?').all(albumName);
    if (tracks.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
    res.json({
      data: {
        name: albumName,
        artist: tracks[0].artist,
        track_count: tracks.length,
        total_duration: totalDuration,
        tracks,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /folders - return all folders
router.get('/folders', (req, res) => {
  try {
    const folders = db.prepare('SELECT * FROM folders').all();
    res.json({ data: folders, total: folders.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /folders/* - return tracks from a specific folder path
router.get('/folders/*', (req, res) => {
  try {
    const folderPath = '/' + (req.params[0] || '');
    const tracks = db.prepare(
      'SELECT * FROM tracks WHERE path LIKE ?'
    ).all(folderPath + '/%');
    const folder = db.prepare('SELECT * FROM folders WHERE path = ?').get(folderPath);
    res.json({
      data: {
        path: folderPath,
        folder: folder || null,
        tracks,
        total: tracks.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /search - search tracks/albums/artists/playlists by query
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ data: { tracks: [], albums: [], artists: [], playlists: [] } });
    }
    const like = `%${q}%`;

    const tracks = db.prepare(
      'SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? OR genre LIKE ?'
    ).all(like, like, like, like);

    const albums = db.prepare(
      'SELECT DISTINCT album, artist FROM tracks WHERE album LIKE ?'
    ).all(like);

    const artists = db.prepare(
      'SELECT DISTINCT artist FROM tracks WHERE artist LIKE ?'
    ).all(like);

    const playlists = db.prepare(
      'SELECT * FROM playlists WHERE name LIKE ?'
    ).all(like);

    res.json({
      data: {
        tracks,
        albums,
        artists,
        playlists,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;