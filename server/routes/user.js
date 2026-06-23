const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to optionally extract user from token
function optionalAuth(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const token = header.split(' ')[1];
    return jwt.verify(token, config.JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// GET /favorites - return user's favorite tracks (optional auth)
router.get('/favorites', (req, res) => {
  try {
    const user = optionalAuth(req);
    if (!user) {
      return res.json({ data: [], total: 0 });
    }
    const favorites = db.prepare(
      'SELECT t.*, f.created_at as favorited_at FROM favorites f JOIN tracks t ON f.track_id = t.id WHERE f.user_id = ? ORDER BY f.created_at DESC'
    ).all(user.id);
    res.json({ data: favorites, total: favorites.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /favorites/:trackId - add to favorites (auth required)
router.post('/favorites/:trackId', auth, (req, res) => {
  try {
    const trackId = parseInt(req.params.trackId, 10);
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    db.prepare('INSERT OR IGNORE INTO favorites (user_id, track_id) VALUES (?, ?)').run(req.user.id, trackId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /favorites/:trackId - remove from favorites (auth required)
router.delete('/favorites/:trackId', auth, (req, res) => {
  try {
    const trackId = parseInt(req.params.trackId, 10);
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND track_id = ?').run(req.user.id, trackId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /history - return user's play history (optional auth)
router.get('/history', (req, res) => {
  try {
    const user = optionalAuth(req);
    if (!user) {
      return res.json({ data: [], total: 0 });
    }
    const history = db.prepare(
      'SELECT ph.*, t.title, t.artist, t.album, t.genre, t.duration, t.cover_path, t.lyrics, t.path, t.play_count FROM play_history ph JOIN tracks t ON ph.track_id = t.id WHERE ph.user_id = ? ORDER BY ph.played_at DESC'
    ).all(user.id);
    res.json({ data: history, total: history.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /history/:trackId - add to play history (auth required)
router.post('/history/:trackId', auth, (req, res) => {
  try {
    const trackId = parseInt(req.params.trackId, 10);
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    db.prepare('INSERT INTO play_history (user_id, track_id, progress) VALUES (?, ?, ?)').run(req.user.id, trackId, 0);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;