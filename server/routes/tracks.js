const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /tracks
router.get('/', (req, res) => {
  try {
    const { q } = req.query;
    let tracks;
    if (q) {
      tracks = db.prepare(
        'SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? OR genre LIKE ?'
      ).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    } else {
      tracks = db.prepare('SELECT * FROM tracks').all();
    }
    res.json({ data: tracks, total: tracks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tracks/:id
router.get('/:id', (req, res) => {
  try {
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.json({ data: track });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /tracks/:id/play
router.post('/:id/play', (req, res) => {
  try {
    const { id } = req.params;
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    db.prepare('UPDATE tracks SET play_count = play_count + 1 WHERE id = ?').run(id);

    // If user is authenticated, add to play history
    // (auth middleware is optional here, so we check req.user)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const config = require('../config');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.JWT_SECRET);
        db.prepare('INSERT INTO play_history (user_id, track_id, progress) VALUES (?, ?, ?)').run(decoded.id, id, 0);
      } catch (e) {
        // Token invalid, skip history
      }
    }

    const updated = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;