const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /playlists
router.get('/', (req, res) => {
  try {
    const playlists = db.prepare('SELECT * FROM playlists').all();
    res.json({ data: playlists, total: playlists.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /playlists/:id
router.get('/:id', (req, res) => {
  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    let trackIds = [];
    try {
      trackIds = JSON.parse(playlist.tracks);
    } catch (e) {
      trackIds = [];
    }

    let tracks = [];
    if (trackIds.length > 0) {
      const placeholders = trackIds.map(() => '?').join(',');
      tracks = db.prepare(`SELECT * FROM tracks WHERE id IN (${placeholders})`).all(...trackIds);
    }

    res.json({ data: { ...playlist, tracks } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /playlists
router.post('/', auth, (req, res) => {
  try {
    const { name, tracks, cover, duration } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    const result = db.prepare(
      'INSERT INTO playlists (name, type, owner_id, tracks, cover, duration) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, 'user', req.user.id, JSON.stringify(tracks || []), cover || null, duration || null);

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /playlists/:id/favorite
router.post('/:id/favorite', auth, (req, res) => {
  try {
    const playlistId = req.params.id;
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    let trackIds = [];
    try {
      trackIds = JSON.parse(playlist.tracks);
    } catch (e) {
      trackIds = [];
    }

    const insertFav = db.prepare('INSERT OR IGNORE INTO favorites (user_id, track_id) VALUES (?, ?)');
    const addFavs = db.transaction(() => {
      for (const trackId of trackIds) {
        insertFav.run(req.user.id, trackId);
      }
    });
    addFavs();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /playlists/:id/favorite
router.delete('/:id/favorite', auth, (req, res) => {
  try {
    const playlistId = req.params.id;
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    let trackIds = [];
    try {
      trackIds = JSON.parse(playlist.tracks);
    } catch (e) {
      trackIds = [];
    }

    const deleteFav = db.prepare('DELETE FROM favorites WHERE user_id = ? AND track_id = ?');
    const delFavs = db.transaction(() => {
      for (const trackId of trackIds) {
        deleteFav.run(req.user.id, trackId);
      }
    });
    delFavs();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;